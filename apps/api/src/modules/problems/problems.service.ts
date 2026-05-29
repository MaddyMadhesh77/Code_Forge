type ProblemRecord = {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isPublished: boolean;
};

type CustomTestCaseRecord = {
  id: string;
  input: string;
  expected: string;
  isHidden: boolean;
  ordinal: number;
  createdAt: string;
  updatedAt: string;
};

type CustomProblemRecord = {
  id: string;
  ownerId: string;
  teamId: string | null;
  slug: string;
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  constraints: string | null;
  starterCode: Record<string, string>;
  supportedLangs: Array<'python' | 'javascript' | 'cpp' | 'java'>;
  isPublished: boolean;
  visibility: 'PRIVATE' | 'TEAM' | 'PUBLIC';
  testCases: CustomTestCaseRecord[];
  createdAt: string;
  updatedAt: string;
};

const problems: ProblemRecord[] = [
  {
    id: '33333333-3333-3333-3333-333333333333',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'EASY',
    isPublished: true,
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    slug: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: 'MEDIUM',
    isPublished: true,
  },
];

const customProblems: CustomProblemRecord[] = [];

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class ProblemsService {
  listPublished() {
    return problems.filter((problem) => problem.isPublished);
  }

  getPublicBySlug(slug: string) {
    return this.listPublished().find((problem) => problem.slug === slug) ?? null;
  }

  listCustomProblems(teamId?: string, ownerId?: string) {
    return customProblems.filter((problem) => {
      if (teamId && problem.teamId !== teamId) {
        return false;
      }

      if (ownerId && problem.ownerId !== ownerId) {
        return false;
      }

      return true;
    });
  }

  createCustomProblem(input: {
    ownerId: string;
    teamId?: string;
    title: string;
    description: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    constraints?: string | null;
    starterCode?: Record<string, string>;
    supportedLangs?: Array<'python' | 'javascript' | 'cpp' | 'java'>;
    visibility?: 'PRIVATE' | 'TEAM' | 'PUBLIC';
  }) {
    const now = new Date().toISOString();
    const problem: CustomProblemRecord = {
      id: makeId('custom-problem'),
      ownerId: input.ownerId,
      teamId: input.teamId ?? null,
      slug: input.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: input.title,
      description: input.description,
      difficulty: input.difficulty,
      constraints: input.constraints ?? null,
      starterCode: input.starterCode ?? {},
      supportedLangs: input.supportedLangs ?? ['python', 'javascript'],
      isPublished: false,
      visibility: input.visibility ?? 'PRIVATE',
      testCases: [],
      createdAt: now,
      updatedAt: now,
    };

    customProblems.push(problem);
    return problem;
  }

  getCustomProblem(problemId: string) {
    return customProblems.find((problem) => problem.id === problemId) ?? null;
  }

  addPrivateTestCase(
    problemId: string,
    input: { input: string; expected: string; isHidden?: boolean },
  ) {
    const problem = this.getCustomProblem(problemId);

    if (!problem) {
      throw new Error('CUSTOM_PROBLEM_NOT_FOUND');
    }

    const now = new Date().toISOString();
    const testCase: CustomTestCaseRecord = {
      id: makeId('custom-test-case'),
      input: input.input,
      expected: input.expected,
      isHidden: input.isHidden ?? true,
      ordinal: problem.testCases.length,
      createdAt: now,
      updatedAt: now,
    };

    problem.testCases.push(testCase);
    problem.updatedAt = now;
    return testCase;
  }

  listPrivateTestCases(problemId: string) {
    const problem = this.getCustomProblem(problemId);

    if (!problem) {
      throw new Error('CUSTOM_PROBLEM_NOT_FOUND');
    }

    return [...problem.testCases];
  }

  shareProblemWithTeam(problemId: string, teamId: string) {
    const problem = this.getCustomProblem(problemId);

    if (!problem) {
      throw new Error('CUSTOM_PROBLEM_NOT_FOUND');
    }

    problem.teamId = teamId;
    problem.visibility = 'TEAM';
    problem.updatedAt = new Date().toISOString();
    return problem;
  }
}

