import type {
  Problem,
  InterviewSession,
  Submission,
  DashboardMetrics,
  DashboardOverview,
  UsageMetrics,
  ProblemListItem,
} from '../types';

export const mockProblems: Problem[] = [
  {
    id: '33333333-3333-3333-3333-333333333333',
    title: 'Two Sum',
    slug: 'two-sum',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution.',
    difficulty: 'EASY',
    constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9',
    supportedLangs: ['python', 'javascript', 'cpp', 'java'],
    isPublished: true,
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring',
    description: 'Given a string s, find the length of the longest substring without repeating characters. Use a sliding window approach for optimal performance.',
    difficulty: 'MEDIUM',
    constraints: '0 <= s.length <= 5 * 10^4',
    supportedLangs: ['python', 'javascript', 'java'],
    isPublished: true,
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    title: 'Merge K Sorted Lists',
    slug: 'merge-k-sorted',
    description: 'You are given an array of k linked-lists, each sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.',
    difficulty: 'HARD',
    constraints: 'k == lists.length\n0 <= k <= 10^4',
    supportedLangs: ['python', 'javascript', 'cpp', 'java'],
    isPublished: true,
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    description: 'Given a string s containing just the characters (, ), {, }, [ and ], determine if the input string is valid. An input string is valid if open brackets are closed in the correct order.',
    difficulty: 'EASY',
    constraints: '1 <= s.length <= 10^4',
    supportedLangs: ['python', 'javascript', 'cpp', 'java'],
    isPublished: true,
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    title: 'Binary Tree Level Order Traversal',
    slug: 'level-order-traversal',
    description: 'Given the root of a binary tree, return the level order traversal of its nodes values. (i.e., from left to right, level by level).',
    difficulty: 'MEDIUM',
    constraints: 'The number of nodes in the tree is in the range [0, 2000].',
    supportedLangs: ['python', 'javascript', 'java'],
    isPublished: true,
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    title: 'Median of Two Sorted Arrays',
    slug: 'median-sorted-arrays',
    description: 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).',
    difficulty: 'HARD',
    constraints: 'nums1.length == m\nnums2.length == n\n0 <= m <= 1000',
    supportedLangs: ['python', 'cpp', 'java'],
    isPublished: true,
  },
];

export const mockSessions: InterviewSession[] = [
  {
    id: 'sess-001',
    title: 'Senior Frontend Developer — Round 1',
    creatorId: '22222222-2222-2222-2222-222222222222',
    creatorName: 'Sarah Chen',
    status: 'ACTIVE',
    scheduledAt: new Date(Date.now() - 30 * 60000).toISOString(),
    startedAt: new Date(Date.now() - 25 * 60000).toISOString(),
    participantCount: 2,
  },
  {
    id: 'sess-002',
    title: 'Backend Engineer — System Design',
    creatorId: '22222222-2222-2222-2222-222222222222',
    creatorName: 'Marcus Johnson',
    status: 'SCHEDULED',
    scheduledAt: new Date(Date.now() + 2 * 3600000).toISOString(),
    participantCount: 3,
  },
  {
    id: 'sess-003',
    title: 'Full Stack Developer — Coding Challenge',
    creatorId: '22222222-2222-2222-2222-222222222222',
    creatorName: 'Priya Sharma',
    status: 'COMPLETED',
    scheduledAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    startedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    endedAt: new Date(Date.now() - 23 * 3600000).toISOString(),
    participantCount: 2,
  },
  {
    id: 'sess-004',
    title: 'ML Engineer — Algorithm Assessment',
    creatorId: '22222222-2222-2222-2222-222222222222',
    creatorName: 'Alex Rivera',
    status: 'CANCELLED',
    scheduledAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    participantCount: 1,
  },
  {
    id: 'sess-005',
    title: 'DevOps Engineer — Infrastructure Review',
    creatorId: '22222222-2222-2222-2222-222222222222',
    creatorName: 'Jordan Lee',
    status: 'SCHEDULED',
    scheduledAt: new Date(Date.now() + 24 * 3600000).toISOString(),
    participantCount: 4,
  },
];

export const mockSubmissions: Submission[] = [
  {
    id: 'sub-001', userId: 'u1', problemId: '33333333-3333-3333-3333-333333333333',
    language: 'python', verdict: 'ACCEPTED', runtimeMs: 42, memoryKb: 14200,
    submittedAt: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: 'sub-002', userId: 'u2', problemId: '44444444-4444-4444-4444-444444444444',
    language: 'javascript', verdict: 'WRONG_ANSWER', runtimeMs: 78, memoryKb: 18400,
    submittedAt: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 'sub-003', userId: 'u1', problemId: '55555555-5555-5555-5555-555555555555',
    language: 'cpp', verdict: 'TIME_LIMIT_EXCEEDED', runtimeMs: 10000, memoryKb: 52000,
    submittedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'sub-004', userId: 'u3', problemId: '33333333-3333-3333-3333-333333333333',
    language: 'java', verdict: 'ACCEPTED', runtimeMs: 55, memoryKb: 22000,
    submittedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'sub-005', userId: 'u2', problemId: '66666666-6666-6666-6666-666666666666',
    language: 'python', verdict: 'ACCEPTED', runtimeMs: 28, memoryKb: 13100,
    submittedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
];

export const mockDashboardMetrics: DashboardMetrics = {
  totalProblems: 156,
  activeSessions: 8,
  submissionsToday: 342,
  acceptanceRate: 67.4,
};

export const mockProblemListItems: ProblemListItem[] = mockProblems.map((problem, index) => {
  const tagPool = ['arrays', 'graphs', 'dp', 'strings', 'math', 'greedy', 'sorting', 'stacks'];
  const tags = [tagPool[index % tagPool.length], tagPool[(index + 3) % tagPool.length]];

  return {
    id: problem.id,
    title: problem.title,
    slug: problem.slug,
    difficulty: problem.difficulty,
    tags,
    author: ['Sarah Chen', 'Marcus Johnson', 'Priya Sharma', 'Alex Rivera'][index % 4],
    updatedAt: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
  };
});

export const mockDashboardOverview: DashboardOverview = {
  activeSessions: 8,
  interviewsToday: 14,
  queuedJobs: 5,
  avgExecTime: 1.8,
  trendSeries: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400000).toISOString(),
    value: 4 + Math.round(Math.random() * 6),
  })),
};

export const mockUsageMetrics: UsageMetrics = {
  range: '7d',
  series: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400000).toISOString(),
    value: 40 + Math.round(Math.random() * 20),
  })),
};
