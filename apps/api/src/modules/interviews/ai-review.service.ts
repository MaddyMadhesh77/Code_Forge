import {
  ComplexityAnalysisService,
  normalizeLanguage,
  stripCommentsAndStrings,
  type Language,
} from "./complexity-analysis.service.js";

export type IssueCategory = "SECURITY" | "PERFORMANCE" | "STYLE" | "CORRECTNESS" | "MAINTAINABILITY";
export type IssueSeverity = "LOW" | "MEDIUM" | "HIGH";

export interface CodeReviewIssue {
  /** Stable identifier, so findings can be suppressed or tracked over time. */
  ruleId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  message: string;
  /** 1-based line number the finding anchors to, when locatable. */
  line?: number;
  remediation?: string;
}

export interface CodeReviewResult {
  score: number;
  issues: CodeReviewIssue[];
  complexity: {
    timeComplexity: string;
    spaceComplexity: string;
    confidence: "LOW" | "MEDIUM" | "HIGH";
    notes: string[];
  };
  recommendations: string[];
  metrics: {
    lines: number;
    nonEmptyLines: number;
    maxLoopDepth: number;
    longestFunctionLines: number;
  };
  /**
   * Names the engine that produced this result. This is deterministic static
   * analysis, not a language model — callers and UI should not imply otherwise.
   */
  analyzer: "static-rules";
}

/**
 * Which view of the source a rule is matched against.
 *
 * - `code`     comments and string literals removed (the default; keeps
 *              keywords inside prose from firing control-flow rules)
 * - `literals` comments removed, strings kept — required by any rule that
 *              inspects literal contents, such as the credential check
 * - `raw`      untouched source, for rules that target comments themselves
 */
type ScanTarget = "code" | "literals" | "raw";

type Rule = {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  message: string;
  remediation?: string;
  pattern: RegExp;
  /** Restricts the rule to specific languages. */
  languages?: Language[];
  scan?: ScanTarget;
};

/**
 * Rules run against comment- and string-stripped source, so a finding cannot
 * be triggered by the word "eval" inside a docstring.
 */
const RULES: Rule[] = [
  {
    id: "security/dynamic-eval",
    category: "SECURITY",
    severity: "HIGH",
    message: "Dynamic code execution (eval/exec) detected.",
    remediation: "Replace dynamic execution with explicit parsing or a dispatch table.",
    pattern: /\b(eval|exec|execfile|Function\s*\(\s*["'])\s*\(/,
  },
  {
    id: "security/shell-injection",
    category: "SECURITY",
    severity: "HIGH",
    message: "Shell command execution with interpolated input.",
    remediation: "Pass arguments as an array to execFile/spawn rather than building a shell string.",
    pattern: /\b(system|popen|exec|execSync|spawnSync)\s*\(\s*[^)]*[`$+]/,
  },
  {
    id: "security/hardcoded-secret",
    category: "SECURITY",
    severity: "HIGH",
    message: "Possible hard-coded credential.",
    remediation: "Load secrets from environment variables or a secret manager.",
    // Requires an assignment to a non-trivial literal, which avoids firing on
    // `password = input()` or a bare parameter named `password`.
    pattern: /\b(password|passwd|secret|api[_-]?key|token|private[_-]?key)\s*[:=]\s*["'][^"']{6,}["']/i,
    // Needs the literal's contents, which the default `code` view blanks out.
    scan: "literals",
  },
  {
    id: "security/weak-hash",
    category: "SECURITY",
    severity: "MEDIUM",
    message: "Weak hash algorithm (MD5/SHA-1) used.",
    remediation: "Use SHA-256 or better; for passwords use scrypt, bcrypt or Argon2.",
    pattern: /\b(md5|sha1)\b/i,
  },
  {
    id: "security/insecure-random",
    category: "SECURITY",
    severity: "MEDIUM",
    message: "Non-cryptographic randomness used where a secret may be required.",
    remediation: "Use crypto.randomBytes / secrets.token_bytes for security-sensitive values.",
    pattern: /\b(Math\.random|random\.random)\s*\(\s*\)[^;\n]*\b(token|secret|key|password|salt|nonce)\b/i,
  },
  {
    id: "correctness/bare-except",
    category: "CORRECTNESS",
    severity: "MEDIUM",
    message: "Exception swallowed without handling.",
    remediation: "Log or rethrow; an empty handler hides real failures.",
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}|except\s*:\s*(\n\s*pass\b)|\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/,
  },
  {
    id: "correctness/loose-equality",
    category: "CORRECTNESS",
    severity: "LOW",
    message: "Loose equality (== / !=) can coerce operands unexpectedly.",
    remediation: "Prefer === and !==.",
    pattern: /[^=!<>]==[^=]|[^!]!=[^=]/,
    languages: ["javascript", "typescript"],
  },
  {
    id: "correctness/mutable-default-arg",
    category: "CORRECTNESS",
    severity: "HIGH",
    message: "Mutable default argument is shared across calls.",
    remediation: "Default to None and create the collection inside the function.",
    pattern: /\bdef\s+\w+\s*\([^)]*=\s*(\[\s*\]|\{\s*\})/,
    languages: ["python"],
  },
  {
    id: "correctness/explicit-any",
    category: "CORRECTNESS",
    severity: "MEDIUM",
    message: "Explicit `any` annotation reduces type safety.",
    remediation: "Use a precise type or `unknown` with a narrowing check.",
    pattern: /:\s*any\b|\bas\s+any\b/,
    languages: ["typescript"],
  },
  {
    id: "performance/string-concat-in-loop",
    category: "PERFORMANCE",
    severity: "MEDIUM",
    message: "String built by repeated concatenation inside a loop.",
    remediation: "Collect parts in an array and join once — concatenation is O(n^2).",
    pattern: /\b\w+\s*\+=\s*(["'`]|\w+\s*[;\n])/,
  },
  {
    id: "performance/linear-membership-test",
    category: "PERFORMANCE",
    severity: "MEDIUM",
    message: "Linear membership test inside a loop.",
    remediation: "Use a set or dictionary for O(1) lookups.",
    pattern: /\b(indexOf|includes)\s*\(|\bin\s+(list|\w+_list)\b/,
  },
  {
    id: "style/debug-logging",
    category: "STYLE",
    severity: "LOW",
    message: "Debug logging left in the submission.",
    remediation: "Remove console/print statements before submitting.",
    pattern: /\b(console\.(log|debug)|print|printf|System\.out\.print(ln)?|cout\s*<<)\s*[(<]/,
  },
  {
    id: "style/magic-number",
    category: "STYLE",
    severity: "LOW",
    message: "Unexplained numeric literal.",
    remediation: "Extract to a named constant.",
    pattern: /[^\w.]\d{4,}[^\w.]/,
  },
  {
    id: "maintainability/todo-marker",
    category: "MAINTAINABILITY",
    severity: "LOW",
    message: "Unfinished work marker left in the code.",
    pattern: /\b(TODO|FIXME|XXX|HACK)\b/,
    scan: "raw",
  },
];

const SEVERITY_PENALTY: Record<IssueSeverity, number> = { HIGH: 20, MEDIUM: 10, LOW: 3 };

/** Beyond this, a function is hard to review in an interview setting. */
const LONG_FUNCTION_LINES = 60;

/**
 * Deterministic static review of a code submission.
 *
 * Despite the historical file name this performs **no** model inference: it is
 * a rule engine plus the structural complexity analysis. The previous version
 * was four regexes run against lowercased source, which both missed real
 * issues and fired on matches inside comments and strings.
 */
export class StaticReviewService {
  constructor(private readonly complexityAnalysisService: ComplexityAnalysisService) {}

  reviewCode(code: string, language: string): CodeReviewResult {
    const lang = normalizeLanguage(language);
    const stripped = stripCommentsAndStrings(code, lang);

    const views: Record<ScanTarget, string[]> = {
      code: stripped.split("\n"),
      literals: stripCommentsAndStrings(code, lang, true).split("\n"),
      raw: code.split("\n"),
    };

    const issues: CodeReviewIssue[] = [];

    for (const rule of RULES) {
      if (rule.languages && !rule.languages.includes(lang)) {
        continue;
      }

      // Scan line by line so each finding carries a location.
      views[rule.scan ?? "code"].forEach((line, index) => {
        if (!rule.pattern.test(line)) {
          return;
        }

        // One finding per rule keeps the report readable; the line recorded is
        // the first occurrence.
        if (issues.some((issue) => issue.ruleId === rule.id)) {
          return;
        }

        issues.push({
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity,
          message: rule.message,
          line: index + 1,
          ...(rule.remediation ? { remediation: rule.remediation } : {}),
        });
      });
    }

    const complexity = this.complexityAnalysisService.analyze(code, language);
    const metrics = measureStructure(code, stripped, complexity.signals.maxLoopDepth);

    if (complexity.signals.maxLoopDepth >= 2) {
      issues.push({
        ruleId: "performance/nested-loops",
        category: "PERFORMANCE",
        severity: complexity.signals.maxLoopDepth >= 3 ? "HIGH" : "MEDIUM",
        message: `Estimated time complexity is ${complexity.timeComplexity} from ${complexity.signals.maxLoopDepth} levels of loop nesting.`,
        remediation: "Consider hashing, sorting with two pointers, or pruning to reduce the bound.",
      });
    }

    if (complexity.signals.hasBranchingRecursion && !complexity.signals.memoizes) {
      issues.push({
        ruleId: "performance/unmemoized-recursion",
        category: "PERFORMANCE",
        severity: "HIGH",
        message: "Branching recursion without memoization recomputes overlapping subproblems.",
        remediation: "Add memoization or convert to bottom-up dynamic programming.",
      });
    }

    if (metrics.longestFunctionLines > LONG_FUNCTION_LINES) {
      issues.push({
        ruleId: "maintainability/long-function",
        category: "MAINTAINABILITY",
        severity: "LOW",
        message: `Longest function spans ${metrics.longestFunctionLines} lines.`,
        remediation: "Extract helpers so each function has a single responsibility.",
      });
    }

    const recommendations = buildRecommendations(issues);

    const score = Math.max(
      0,
      Math.min(
        100,
        100 - issues.reduce((total, issue) => total + SEVERITY_PENALTY[issue.severity], 0),
      ),
    );

    return {
      score,
      // Most severe first, so a reviewer reads what matters.
      issues: issues.sort(
        (a, b) => SEVERITY_PENALTY[b.severity] - SEVERITY_PENALTY[a.severity],
      ),
      complexity: {
        timeComplexity: complexity.timeComplexity,
        spaceComplexity: complexity.spaceComplexity,
        confidence: complexity.confidence,
        notes: complexity.notes,
      },
      recommendations,
      metrics,
      analyzer: "static-rules",
    };
  }
}

function buildRecommendations(issues: CodeReviewIssue[]): string[] {
  const recommendations = issues
    .map((issue) => issue.remediation)
    .filter((value): value is string => Boolean(value));

  // De-duplicate while preserving order.
  const unique = [...new Set(recommendations)];

  if (unique.length === 0) {
    unique.push("No rule violations detected; add edge-case tests for extra confidence.");
  }

  return unique;
}

function measureStructure(
  original: string,
  stripped: string,
  maxLoopDepth: number,
): CodeReviewResult["metrics"] {
  const lines = original.split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0).length;

  // Approximate function extent by counting lines between declarations.
  const declarationLines: number[] = [];
  stripped.split("\n").forEach((line, index) => {
    if (/\b(function\s+\w+|def\s+\w+|\w+\s*=\s*(async\s*)?\()/.test(line)) {
      declarationLines.push(index);
    }
  });

  let longestFunctionLines = 0;

  for (let index = 0; index < declarationLines.length; index += 1) {
    const start = declarationLines[index];
    const end = declarationLines[index + 1] ?? lines.length;
    longestFunctionLines = Math.max(longestFunctionLines, end - start);
  }

  return {
    lines: lines.length,
    nonEmptyLines,
    maxLoopDepth,
    longestFunctionLines,
  };
}

/**
 * @deprecated Retained so existing imports keep compiling. Prefer
 * `StaticReviewService` — the analysis is rule-based, not model-based.
 */
export const AiReviewService = StaticReviewService;
export type AiReviewService = StaticReviewService;
