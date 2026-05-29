

export interface ComplexityAnalysisResult {
  timeComplexity: string;
  spaceComplexity: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  notes: string[];
}


export class ComplexityAnalysisService {
  analyze(code: string): ComplexityAnalysisResult {
    const normalized = code.toLowerCase();
    const notes: string[] = [];

    const hasSort = /\b(sort|sorted|orderby|order_by)\b/.test(normalized);
    const hasHashMap = /\b(map|set|dict|hashmap|hashtable|object)\b/.test(normalized);
    const hasRecursion = this.detectRecursion(code);
    const nestedLoopDepth = this.estimateNestedLoopDepth(normalized);

    let timeComplexity = 'O(1)';
    let spaceComplexity = hasHashMap ? 'O(n)' : 'O(1)';
    let confidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

    if (hasSort) {
      timeComplexity = 'O(n log n)';
      notes.push('Detected sorting operation, usually O(n log n).');
    }

    if (nestedLoopDepth >= 3) {
      timeComplexity = 'O(n^3)';
      notes.push('Detected triple nested loops.');
      confidence = 'HIGH';
    } else if (nestedLoopDepth === 2) {
      timeComplexity = hasSort ? 'O(n^2 + n log n)' : 'O(n^2)';
      notes.push('Detected double nested loops.');
      confidence = 'HIGH';
    } else if (nestedLoopDepth === 1 && !hasSort) {
      timeComplexity = 'O(n)';
      notes.push('Detected single loop traversal.');
      confidence = 'HIGH';
    }

    if (hasRecursion) {
      notes.push('Detected recursion; exact bound depends on recurrence relation.');
      if (timeComplexity === 'O(1)') {
        timeComplexity = 'O(?)';
      }
      confidence = confidence === 'HIGH' ? 'MEDIUM' : 'LOW';
    }

    if (/\b(dp|memo|memoization|cache)\b/.test(normalized)) {
      spaceComplexity = 'O(n)';
      notes.push('Detected memoization or caching usage.');
    }

    if (notes.length === 0) {
      notes.push('No strong complexity signals found; result is heuristic.');
      confidence = 'LOW';
    }

    return {
      timeComplexity,
      spaceComplexity,
      confidence,
      notes,
    };
  }

  private estimateNestedLoopDepth(code: string): number {
    const loopPattern = /\b(for|while)\b/g;
    const loopMatches = code.match(loopPattern);
    if (!loopMatches) {
      return 0;
    }

    // Heuristic: rough upper bound for practical interview code snippets.
    return Math.min(loopMatches.length, 3);
  }

  private detectRecursion(code: string): boolean {
    const functionNames = Array.from(
      code.matchAll(/function\s+([a-zA-Z_$][\w$]*)\s*\(|(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*\([^)]*\)\s*=>/g),
    ).flatMap((m) => [m[1], m[2]].filter(Boolean) as string[]);

    return functionNames.some((name) => {
      const selfCallPattern = new RegExp(`\\b${name}\\s*\\(`, 'g');
      const occurrences = code.match(selfCallPattern)?.length ?? 0;
      return occurrences > 1;
    });
  }
}

