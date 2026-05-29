
import { ComplexityAnalysisService } from './complexity-analysis.service.js';

export interface CodeReviewIssue {
  category: 'SECURITY' | 'PERFORMANCE' | 'STYLE' | 'CORRECTNESS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
}

export interface CodeReviewResult {
  score: number;
  issues: CodeReviewIssue[];
  complexity: {
    timeComplexity: string;
    spaceComplexity: string;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  recommendations: string[];
}


export class AiReviewService {
  constructor(private complexityAnalysisService: ComplexityAnalysisService) {}

  reviewCode(code: string, language: string): CodeReviewResult {
    const issues: CodeReviewIssue[] = [];
    const recommendations: string[] = [];
    const normalized = code.toLowerCase();

    if (/console\.log|print\(/.test(normalized)) {
      issues.push({
        category: 'STYLE',
        severity: 'LOW',
        message: 'Debug logging is present in submission code.',
      });
    }

    if (/\beval\s*\(|exec\s*\(/.test(normalized)) {
      issues.push({
        category: 'SECURITY',
        severity: 'HIGH',
        message: 'Potentially unsafe dynamic code execution detected.',
      });
      recommendations.push('Avoid dynamic execution APIs (eval/exec) in interview submissions.');
    }

    if (/password\s*=|secret\s*=|api[_-]?key\s*=/.test(normalized)) {
      issues.push({
        category: 'SECURITY',
        severity: 'HIGH',
        message: 'Possible hard-coded secret detected.',
      });
      recommendations.push('Move sensitive values to environment variables or secret managers.');
    }

    if (/\bany\b/.test(normalized) && language.toLowerCase().includes('ts')) {
      issues.push({
        category: 'CORRECTNESS',
        severity: 'MEDIUM',
        message: 'TypeScript any-typed usage found; type safety may be reduced.',
      });
    }

    const complexity = this.complexityAnalysisService.analyze(code);
    if (complexity.timeComplexity.includes('n^2') || complexity.timeComplexity.includes('n^3')) {
      issues.push({
        category: 'PERFORMANCE',
        severity: 'MEDIUM',
        message: `Estimated time complexity is ${complexity.timeComplexity}.`,
      });
      recommendations.push('Consider using hash maps, sorting + two-pointer, or pruning to reduce complexity.');
    }

    if (issues.length === 0) {
      recommendations.push('No obvious static issues detected; add edge-case tests for extra confidence.');
    }

    const score = Math.max(
      0,
      100 -
        issues.reduce((sum, issue) => {
          if (issue.severity === 'HIGH') {
            return sum + 20;
          }
          if (issue.severity === 'MEDIUM') {
            return sum + 10;
          }
          return sum + 5;
        }, 0),
    );

    return {
      score,
      issues,
      complexity: {
        timeComplexity: complexity.timeComplexity,
        spaceComplexity: complexity.spaceComplexity,
        confidence: complexity.confidence,
      },
      recommendations,
    };
  }
}

