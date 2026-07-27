import { describe, expect, it } from "vitest";

import { ComplexityAnalysisService } from "./complexity-analysis.service.js";
import { StaticReviewService } from "./ai-review.service.js";

const complexity = new ComplexityAnalysisService();
const review = new StaticReviewService(complexity);

describe("complexity analysis", () => {
  it("treats sequential loops as linear, not quadratic", () => {
    // The old implementation counted `for` occurrences anywhere in the file,
    // so this reported O(n^2).
    const code = `
      function twoPasses(items) {
        for (let i = 0; i < items.length; i++) {
          console.log(items[i]);
        }
        for (let j = 0; j < items.length; j++) {
          console.log(items[j]);
        }
      }
    `;

    const result = complexity.analyze(code, "javascript");

    expect(result.signals.maxLoopDepth).toBe(1);
    expect(result.signals.loopCount).toBe(2);
    expect(result.timeComplexity).toBe("O(n)");
  });

  it("detects genuinely nested loops as quadratic", () => {
    const code = `
      function pairs(items) {
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            console.log(items[i], items[j]);
          }
        }
      }
    `;

    const result = complexity.analyze(code, "javascript");

    expect(result.signals.maxLoopDepth).toBe(2);
    expect(result.timeComplexity).toBe("O(n^2)");
  });

  it("is not capped at three levels of nesting", () => {
    // The old `Math.min(matches.length, 3)` made O(n^4) unreportable.
    const code = `
      for (let a = 0; a < n; a++) {
        for (let b = 0; b < n; b++) {
          for (let c = 0; c < n; c++) {
            for (let d = 0; d < n; d++) {
              total += a + b + c + d;
            }
          }
        }
      }
    `;

    expect(complexity.analyze(code, "javascript").signals.maxLoopDepth).toBe(4);
  });

  it("measures Python nesting by indentation", () => {
    const nested = `
def pairs(items):
    for i in range(len(items)):
        for j in range(len(items)):
            print(i, j)
`;
    const sequential = `
def passes(items):
    for i in range(len(items)):
        print(i)
    for j in range(len(items)):
        print(j)
`;

    expect(complexity.analyze(nested, "python").signals.maxLoopDepth).toBe(2);
    expect(complexity.analyze(sequential, "python").signals.maxLoopDepth).toBe(1);
  });

  it("ignores keywords inside comments and strings", () => {
    const code = `
      // for each item we do something
      function noLoops(items) {
        const message = "for while for";
        return message;
      }
    `;

    const result = complexity.analyze(code, "javascript");

    expect(result.signals.loopCount).toBe(0);
    expect(result.timeComplexity).toBe("O(1)");
  });

  it("flags unmemoized branching recursion as exponential", () => {
    const code = `
      function fib(n) {
        if (n < 2) return n;
        return fib(n - 1) + fib(n - 2);
      }
    `;

    const result = complexity.analyze(code, "javascript");

    expect(result.signals.recursiveFunctions).toContain("fib");
    expect(result.signals.hasBranchingRecursion).toBe(true);
    expect(result.timeComplexity).toBe("O(2^n)");
  });

  it("recognises sorting as O(n log n)", () => {
    const result = complexity.analyze(
      "function s(a) { return a.sort((x, y) => x - y); }",
      "javascript",
    );

    expect(result.signals.hasSort).toBe(true);
    expect(result.timeComplexity).toBe("O(n log n)");
  });
});

describe("static review", () => {
  it("labels itself as rule-based, not model-generated", () => {
    const result = review.reviewCode("const a = 1;", "javascript");
    expect(result.analyzer).toBe("static-rules");
  });

  it("flags a hard-coded credential with a location", () => {
    const result = review.reviewCode(
      'const config = {};\nconst password = "hunter2-not-a-real-secret";\n',
      "javascript",
    );

    const finding = result.issues.find((issue) => issue.ruleId === "security/hardcoded-secret");

    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("HIGH");
    expect(finding?.line).toBe(2);
  });

  it("does not fire on a secret mentioned only in a comment", () => {
    const result = review.reviewCode(
      '// never write password = "literal" in source\nconst x = 1;\n',
      "javascript",
    );

    expect(result.issues.some((issue) => issue.ruleId === "security/hardcoded-secret")).toBe(false);
  });

  it("flags dynamic execution", () => {
    const result = review.reviewCode('eval ("2 + 2");', "javascript");

    expect(result.issues.some((issue) => issue.ruleId === "security/dynamic-eval")).toBe(true);
  });

  it("flags a Python mutable default argument", () => {
    const result = review.reviewCode("def f(items=[]):\n    return items\n", "python");

    expect(
      result.issues.some((issue) => issue.ruleId === "correctness/mutable-default-arg"),
    ).toBe(true);
  });

  it("keeps the score within bounds and orders findings by severity", () => {
    const result = review.reviewCode(
      'const password = "aaaaaaaaaa";\neval ("x");\nconsole.log("debug");\n// TODO fix\n',
      "javascript",
    );

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);

    const severities = result.issues.map((issue) => issue.severity);
    const rank = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;
    for (let i = 1; i < severities.length; i += 1) {
      expect(rank[severities[i - 1]]).toBeGreaterThanOrEqual(rank[severities[i]]);
    }
  });

  it("returns a clean result for unremarkable code", () => {
    const result = review.reviewCode("function add(a, b) {\n  return a + b;\n}\n", "javascript");

    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });
});
