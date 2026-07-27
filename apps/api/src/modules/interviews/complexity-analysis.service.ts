export interface ComplexityAnalysisResult {
  timeComplexity: string;
  spaceComplexity: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  notes: string[];
  /** Structural facts the estimate was derived from. */
  signals: {
    maxLoopDepth: number;
    loopCount: number;
    hasSort: boolean;
    recursiveFunctions: string[];
    /** Recursion with more than one self-call, e.g. naive fib. */
    hasBranchingRecursion: boolean;
    allocatesCollection: boolean;
    memoizes: boolean;
  };
}

export type Language = "python" | "javascript" | "typescript" | "java" | "cpp" | "unknown";

const LOOP_KEYWORDS = /\b(for|while|forEach|foreach)\b/;

const SORT_PATTERN =
  /\b(sort|sorted|sortBy|order_by|orderBy|nlargest|nsmallest|heapify)\b|std::sort|Arrays\.sort|Collections\.sort/;

const COLLECTION_PATTERN =
  /(\bnew\s+(Map|Set|Array|HashMap|HashSet|ArrayList|LinkedList)\b|\b(dict|set|list|defaultdict|Counter|deque)\s*\(|\[\s*\]|\{\s*\}|\bvector\s*<|\bunordered_(map|set)\s*<)/;

const MEMO_PATTERN = /\b(memo|memoize|lru_cache|cache|dp)\b/;

/**
 * Static complexity estimation.
 *
 * The previous implementation counted `for`/`while` occurrences anywhere in
 * the file and capped the result at 3 — so two *sequential* loops were
 * reported as O(n^2). This version tracks real block nesting (braces for
 * C-family languages, indentation for Python), so only genuinely nested loops
 * raise the exponent.
 *
 * It remains a heuristic and reports confidence accordingly; it is not a
 * substitute for reading the code.
 */
export class ComplexityAnalysisService {
  analyze(code: string, language: string = "unknown"): ComplexityAnalysisResult {
    const lang = normalizeLanguage(language);
    const stripped = stripCommentsAndStrings(code, lang);
    const notes: string[] = [];

    const { maxDepth, loopCount } = measureLoopNesting(stripped, lang);
    const recursion = findRecursiveFunctions(stripped);
    const hasSort = SORT_PATTERN.test(stripped);
    const allocatesCollection = COLLECTION_PATTERN.test(stripped);
    const memoizes = MEMO_PATTERN.test(stripped);

    let timeComplexity = "O(1)";
    let confidence: ComplexityAnalysisResult["confidence"] = "MEDIUM";

    if (maxDepth >= 1) {
      timeComplexity = `O(n${maxDepth > 1 ? `^${maxDepth}` : ""})`;
      notes.push(
        maxDepth === 1
          ? `Detected ${loopCount} loop(s), none nested — linear traversal.`
          : `Detected loop nesting ${maxDepth} levels deep.`,
      );
      confidence = "HIGH";
    }

    // Sorting dominates a single linear pass, but not a nested one.
    if (hasSort) {
      notes.push("Detected a sort, typically O(n log n).");

      if (maxDepth <= 1) {
        timeComplexity = "O(n log n)";
        confidence = "MEDIUM";
      } else {
        notes.push("Nested loops dominate the sort in the overall bound.");
      }
    }

    if (recursion.names.length > 0) {
      notes.push(
        `Detected recursion in: ${recursion.names.join(", ")}. The exact bound depends on the recurrence relation.`,
      );

      if (recursion.branching && !memoizes) {
        // Multiple self-calls per invocation without memoization.
        timeComplexity = maxDepth > 0 ? `O(2^n * n^${maxDepth})` : "O(2^n)";
        notes.push("Multiple self-calls without memoization suggest exponential growth.");
        confidence = "LOW";
      } else if (recursion.branching && memoizes) {
        timeComplexity = maxDepth > 0 ? `O(n^${maxDepth + 1})` : "O(n)";
        notes.push("Memoization collapses the recursion tree to polynomial time.");
        confidence = "LOW";
      } else if (timeComplexity === "O(1)") {
        timeComplexity = "O(n)";
        notes.push("Linear recursion assumed; verify the recurrence.");
        confidence = "LOW";
      } else {
        confidence = confidence === "HIGH" ? "MEDIUM" : "LOW";
      }
    }

    let spaceComplexity = "O(1)";

    if (allocatesCollection || memoizes) {
      spaceComplexity = "O(n)";
      notes.push(
        memoizes
          ? "Memoization table allocates auxiliary space."
          : "Allocates an auxiliary collection.",
      );
    }

    if (recursion.names.length > 0 && spaceComplexity === "O(1)") {
      spaceComplexity = "O(n)";
      notes.push("Recursion consumes stack space proportional to depth.");
    }

    if (notes.length === 0) {
      notes.push("No strong structural signals found; treat this estimate as low confidence.");
      confidence = "LOW";
    }

    return {
      timeComplexity,
      spaceComplexity,
      confidence,
      notes,
      signals: {
        maxLoopDepth: maxDepth,
        loopCount,
        hasSort,
        recursiveFunctions: recursion.names,
        hasBranchingRecursion: recursion.branching,
        allocatesCollection,
        memoizes,
      },
    };
  }
}

export function normalizeLanguage(language: string): Language {
  const value = language.toLowerCase();

  if (value.includes("py")) return "python";
  if (value.includes("ts") || value.includes("typescript")) return "typescript";
  if (value.includes("js") || value.includes("javascript")) return "javascript";
  if (value.includes("java")) return "java";
  if (value.includes("c++") || value.includes("cpp") || value === "c") return "cpp";

  return "unknown";
}

/**
 * Removes comments, and optionally string literals, so keywords inside them
 * (`"for now"`) are not mistaken for control flow. Newlines are preserved
 * because the Python path depends on line structure.
 *
 * `keepStrings` exists for rules that must inspect literal *contents* — a
 * hard-coded-credential check cannot work on source whose strings have already
 * been blanked out.
 */
export function stripCommentsAndStrings(
  code: string,
  language: Language,
  keepStrings = false,
): string {
  let output = "";
  let index = 0;

  const isPython = language === "python";

  while (index < code.length) {
    const char = code[index];
    const next = code[index + 1];

    // Line comments.
    if ((char === "/" && next === "/") || (isPython && char === "#")) {
      while (index < code.length && code[index] !== "\n") index += 1;
      continue;
    }

    // Block comments.
    if (char === "/" && next === "*") {
      index += 2;
      while (index < code.length && !(code[index] === "*" && code[index + 1] === "/")) {
        if (code[index] === "\n") output += "\n";
        index += 1;
      }
      index += 2;
      continue;
    }

    // Triple-quoted Python strings, which also serve as block comments.
    if (isPython && (code.startsWith('"""', index) || code.startsWith("'''", index))) {
      const quote = code.slice(index, index + 3);
      index += 3;
      while (index < code.length && !code.startsWith(quote, index)) {
        if (code[index] === "\n") output += "\n";
        index += 1;
      }
      index += 3;
      continue;
    }

    // String literals: either preserved verbatim, or replaced with an empty
    // placeholder so tokens stay separated.
    if (char === '"' || char === "'" || char === "`") {
      const quote = char;
      const start = index;
      index += 1;

      while (index < code.length && code[index] !== quote) {
        // Skip escaped characters so `\"` doesn't end the literal early.
        index += code[index] === "\\" ? 2 : 1;
      }

      index += 1;
      output += keepStrings ? code.slice(start, index) : '""';
      continue;
    }

    output += char;
    index += 1;
  }

  return output;
}

/**
 * Computes the maximum *nesting* depth of loops.
 *
 * C-family languages are tracked with a brace stack; Python uses indentation.
 * Either way, sequential loops at the same level yield depth 1, not 2.
 */
export function measureLoopNesting(
  code: string,
  language: Language,
): { maxDepth: number; loopCount: number } {
  return language === "python" ? measureByIndentation(code) : measureByBraces(code);
}

function measureByBraces(code: string): { maxDepth: number; loopCount: number } {
  let depth = 0;
  let maxDepth = 0;
  let loopCount = 0;
  // Parenthesis nesting, so the `;` separators inside a C-style `for (a; b; c)`
  // header are not mistaken for the end of a brace-less loop body.
  let parenDepth = 0;

  // Brace depths at which each currently-open loop body began.
  const loopStack: number[] = [];
  let pendingLoop = false;

  const tokens = code.matchAll(/\b(for|while|forEach|do)\b|[{}();]/g);

  for (const token of tokens) {
    const value = token[0];

    if (value === "for" || value === "while" || value === "forEach" || value === "do") {
      loopCount += 1;
      pendingLoop = true;
      continue;
    }

    if (value === "(") {
      parenDepth += 1;
      continue;
    }

    if (value === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }

    if (value === "{") {
      depth += 1;

      if (pendingLoop) {
        loopStack.push(depth);
        maxDepth = Math.max(maxDepth, loopStack.length);
        pendingLoop = false;
      }

      continue;
    }

    if (value === "}") {
      if (loopStack.length > 0 && loopStack[loopStack.length - 1] === depth) {
        loopStack.pop();
      }
      depth = Math.max(0, depth - 1);
      continue;
    }

    // A `;` at paren depth zero, before any `{`, means a brace-less
    // single-statement loop body, which cannot contain a nested loop.
    if (value === ";" && pendingLoop && parenDepth === 0) {
      pendingLoop = false;
      maxDepth = Math.max(maxDepth, loopStack.length + 1);
    }
  }

  return { maxDepth, loopCount };
}

function measureByIndentation(code: string): { maxDepth: number; loopCount: number } {
  const lines = code.split("\n");
  let maxDepth = 0;
  let loopCount = 0;

  // Indent columns at which each enclosing loop header sits.
  const openLoops: number[] = [];

  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }

    const indent = line.length - line.trimStart().length;

    // Dedenting closes every loop whose body we have left.
    while (openLoops.length > 0 && indent <= openLoops[openLoops.length - 1]) {
      openLoops.pop();
    }

    const trimmed = line.trim();
    const isLoopHeader = /^(for|while)\b/.test(trimmed) && trimmed.includes(":");
    // Comprehensions iterate too, but do not open an indented block.
    const isComprehension = /\bfor\b/.test(trimmed) && /[[{(]/.test(trimmed) && !isLoopHeader;

    if (isLoopHeader) {
      loopCount += 1;
      openLoops.push(indent);
      maxDepth = Math.max(maxDepth, openLoops.length);
    } else if (isComprehension) {
      loopCount += 1;
      // A nested comprehension: `for x in a for y in b`.
      const forCount = (trimmed.match(/\bfor\b/g) ?? []).length;
      maxDepth = Math.max(maxDepth, openLoops.length + forCount);
    } else if (LOOP_KEYWORDS.test(trimmed) && trimmed.includes("(")) {
      loopCount += 1;
      maxDepth = Math.max(maxDepth, openLoops.length + 1);
    }
  }

  return { maxDepth, loopCount };
}

/**
 * Finds functions that call themselves, and whether any does so more than once
 * per body (branching recursion, which grows exponentially without memoization).
 */
export function findRecursiveFunctions(code: string): { names: string[]; branching: boolean } {
  const declarations = [
    ...code.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g),
    ...code.matchAll(/\bdef\s+([A-Za-z_][\w]*)\s*\(/g),
    ...code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g),
  ];

  const names: string[] = [];
  let branching = false;

  for (const declaration of declarations) {
    const name = declaration[1];

    if (!name || names.includes(name)) {
      continue;
    }

    const body = extractFunctionBody(code, declaration.index ?? 0);
    // Count calls *within the body*, so a function merely invoked elsewhere
    // is not misread as recursive.
    const calls = body.match(new RegExp(`\\b${escapeRegExp(name)}\\s*\\(`, "g"))?.length ?? 0;

    if (calls >= 1) {
      names.push(name);

      if (calls >= 2) {
        branching = true;
      }
    }
  }

  return { names, branching };
}

/**
 * Extracts a function body starting at `startIndex`, using braces when present
 * and falling back to Python's indentation rules.
 */
function extractFunctionBody(code: string, startIndex: number): string {
  const braceStart = code.indexOf("{", startIndex);
  const colonStart = code.indexOf(":", startIndex);
  const lineEnd = code.indexOf("\n", startIndex);

  const isBraceBody =
    braceStart !== -1 &&
    (lineEnd === -1 || braceStart < lineEnd + 2) &&
    (colonStart === -1 || braceStart < colonStart);

  if (isBraceBody) {
    let depth = 0;

    for (let index = braceStart; index < code.length; index += 1) {
      if (code[index] === "{") depth += 1;
      if (code[index] === "}") {
        depth -= 1;
        if (depth === 0) {
          return code.slice(braceStart + 1, index);
        }
      }
    }

    return code.slice(braceStart + 1);
  }

  // Python: the body is every subsequent line indented past the `def`.
  const lines = code.slice(startIndex).split("\n");
  const headerIndent = lines[0].length - lines[0].trimStart().length;
  const body: string[] = [];

  for (const line of lines.slice(1)) {
    if (line.trim().length === 0) {
      body.push(line);
      continue;
    }

    const indent = line.length - line.trimStart().length;

    if (indent <= headerIndent) {
      break;
    }

    body.push(line);
  }

  return body.join("\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
