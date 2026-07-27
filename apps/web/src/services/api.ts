import { requestJSON } from './http';
import { axiosClient } from './api/axios';
import {
  mockProblems,
  mockSessions,
  mockSubmissions,
  mockDashboardMetrics,
  mockDashboardOverview,
  mockProblemListItems,
  mockUsageMetrics,
} from './mockData';
import type {
  Role,
  Problem,
  ExecutionRunResult,
  InterviewSession,
  InterviewJoinResponse,
  DashboardMetrics,
  Submission,
  SessionLink,
  SessionRole,
  Scorecard,
  ScorecardReport,
  AntiCheatEvent,
  AntiCheatParticipantReport,
  RecordingArtifact,
  SessionRecording,
  InterviewReport,
  AIReviewResult,
  ComplexityResult,
  AnalyticsDashboardData,
  Webhook,
  DashboardOverview,
  UsageMetrics,
  ProblemListResponse,
  ProblemListItem,
  SessionReplayData,
  ReplayActivityItem,
  ReplayChatMessage,
  ReplayEvent,
  ReplayNote,
  ReplayRecording,
  TeamUser,
  UserActivityItem,
  UserListResponse,
  CurrentUserProfile,
  ApiKey,
  OrgSettings,
  QueueJob,
  QueueJobLog,
  QueueJobsResponse,
  MetricsErrorItem,
  TopProblemItem,
  Language,
} from '../types';

const API_BASE = '';

const SHOULD_USE_FALLBACKS = import.meta.env.DEV || import.meta.env.VITE_USE_MOCKS === 'true';

function unwrapApiPayload<T>(payload: T | { data?: T }): T {
  if (payload && typeof payload === 'object' && 'data' in payload && (payload as { data?: T }).data !== undefined) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

async function requestApi<T>(url: string, fallback: T, options?: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; params?: Record<string, string | number | undefined>; data?: unknown }): Promise<T> {
  try {
    const response = await axiosClient.request<T>({
      url,
      method: options?.method ?? 'GET',
      params: options?.params,
      data: options?.data,
    });

    return unwrapApiPayload(response.data);
  } catch (error) {
    if (SHOULD_USE_FALLBACKS) {
      return fallback;
    }

    throw error;
  }
}

function buildProblemDetailFallback(problem: Problem): Problem {
  return {
    ...problem,
    statement: problem.statement ?? problem.description,
    tags: problem.tags ?? ['arrays', 'two-pointers'],
    samples: problem.samples ?? [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'nums[0] + nums[1] = 9',
      },
    ],
    templates: problem.templates ?? problem.supportedLangs.map((lang) => ({
      language: lang,
      code: lang === 'python'
        ? 'def solve():\n    # TODO\n    pass\n'
        : lang === 'javascript'
          ? 'function solve() {\n  // TODO\n}\n'
          : lang === 'java'
            ? 'class Solution {\n  public void solve() {\n    // TODO\n  }\n}\n'
            : 'int main() {\n  // TODO\n  return 0;\n}\n',
    })),
    editorial: problem.editorial ?? 'Start with a brute-force baseline, then reduce complexity with a hash map.',
  };
}

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function buildReplayFallback(sessionId: string): SessionReplayData {
  const events: ReplayEvent[] = [
    {
      id: `${sessionId}-evt-1`,
      timeMs: 0,
      kind: 'system',
      title: 'Session opened',
      detail: 'Replay loaded and recording began.',
    },
    {
      id: `${sessionId}-evt-2`,
      timeMs: 45_000,
      kind: 'code',
      title: 'Candidate edited solution',
      detail: 'Introduced a hash map to reduce the search complexity.',
      code: 'function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i += 1) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}',
      diff: '- brute force nested loop\n+ hash map lookup',
    },
    {
      id: `${sessionId}-evt-3`,
      timeMs: 78_000,
      kind: 'chat',
      title: 'Interviewer asked about edge cases',
      detail: 'Discussion focused on duplicate values and empty input handling.',
    },
    {
      id: `${sessionId}-evt-4`,
      timeMs: 110_000,
      kind: 'note',
      title: 'Annotation saved',
      detail: 'Good explanation of time complexity tradeoffs.',
    },
  ];

  const recordings: ReplayRecording[] = [
    {
      id: `${sessionId}-rec-screen`,
      label: 'Screen recording',
      kind: 'screen',
      mimeType: 'video/mp4',
      durationMs: 168_000,
      storageUrl: `/api/interviews/${sessionId}/recordings/${sessionId}-rec-screen`,
    },
    {
      id: `${sessionId}-rec-camera`,
      label: 'Camera feed',
      kind: 'camera',
      mimeType: 'video/mp4',
      durationMs: 168_000,
      storageUrl: `/api/interviews/${sessionId}/recordings/${sessionId}-rec-camera`,
    },
  ];

  const chat: ReplayChatMessage[] = [
    {
      id: `${sessionId}-chat-1`,
      role: 'interviewer',
      author: 'Sarah Chen',
      text: 'Walk me through your first pass.',
      timestamp: isoMinutesAgo(55),
    },
    {
      id: `${sessionId}-chat-2`,
      role: 'candidate',
      author: 'Alex Kim',
      text: 'I am using a map to store prior values and check complements in constant time.',
      timestamp: isoMinutesAgo(52),
    },
  ];

  const notes: ReplayNote[] = [
    {
      id: `${sessionId}-note-1`,
      author: 'You',
      note: 'Strong reasoning once the duplicate edge case was introduced.',
      timestamp: isoMinutesAgo(12),
      timeMs: 110_000,
    },
  ];

  const activityLog: ReplayActivityItem[] = [
    { id: `${sessionId}-act-1`, timestamp: isoMinutesAgo(70), message: 'Recording attached successfully.', level: 'success' },
    { id: `${sessionId}-act-2`, timestamp: isoMinutesAgo(47), message: 'Playback seeked to 00:45.', level: 'info' },
    { id: `${sessionId}-act-3`, timestamp: isoMinutesAgo(12), message: 'Annotation saved from notes pane.', level: 'success' },
  ];

  return {
    sessionId,
    title: 'Senior Frontend Developer — Round 1',
    startedAt: isoMinutesAgo(75),
    endedAt: isoMinutesAgo(5),
    events,
    recordings,
    chat,
    notes,
    activityLog,
  };
}

function buildUsersFallback(params: { q?: string; role?: string; page?: number; pageSize?: number }): UserListResponse {
  const users: TeamUser[] = [
    { id: 'user-1', email: 'sarah@codeforge.dev', displayName: 'Sarah Chen', role: 'ADMIN', status: 'ACTIVE', lastActiveAt: isoMinutesAgo(12), title: 'Platform Lead', department: 'Engineering' },
    { id: 'user-2', email: 'marcus@codeforge.dev', displayName: 'Marcus Johnson', role: 'INTERVIEWER', status: 'ACTIVE', lastActiveAt: isoMinutesAgo(46), title: 'Staff Engineer', department: 'Product' },
    { id: 'user-3', email: 'priya@codeforge.dev', displayName: 'Priya Sharma', role: 'CANDIDATE', status: 'INVITED', lastActiveAt: isoMinutesAgo(320), title: 'Candidate', department: 'External' },
    { id: 'user-4', email: 'alex@codeforge.dev', displayName: 'Alex Rivera', role: 'INTERVIEWER', status: 'SUSPENDED', lastActiveAt: isoMinutesAgo(1200), title: 'Senior Engineer', department: 'Core' },
    { id: 'user-5', email: 'jordan@codeforge.dev', displayName: 'Jordan Lee', role: 'ADMIN', status: 'ACTIVE', lastActiveAt: isoMinutesAgo(88), title: 'Operations Manager', department: 'Operations' },
    { id: 'user-6', email: 'taylor@codeforge.dev', displayName: 'Taylor Brooks', role: 'CANDIDATE', status: 'ACTIVE', lastActiveAt: isoMinutesAgo(14), title: 'Backend Candidate', department: 'External' },
  ];

  const q = (params.q ?? '').toLowerCase();
  const role = params.role ?? '';
  const filtered = users.filter((user) => {
    const matchesQuery = !q || user.displayName.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
    const matchesRole = !role || user.role === role;
    return matchesQuery && matchesRole;
  });

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), total: filtered.length };
}

function buildQueueFallback(params: { state?: string; page?: number; pageSize?: number }): QueueJobsResponse {
  const jobs: QueueJob[] = [
    { id: 'job-9001', type: 'execution.run', state: 'running', attempts: 1, progress: 62, createdAt: isoMinutesAgo(32), updatedAt: isoMinutesAgo(2), startedAt: isoMinutesAgo(31), payloadSummary: 'Execute two-sum submission', worker: 'worker-2' },
    { id: 'job-9002', type: 'report.generate', state: 'failed', attempts: 3, progress: 100, createdAt: isoMinutesAgo(95), updatedAt: isoMinutesAgo(18), startedAt: isoMinutesAgo(92), finishedAt: isoMinutesAgo(18), payloadSummary: 'Generate interview report PDF', worker: 'worker-1' },
    { id: 'job-9003', type: 'notifications.dispatch', state: 'queued', attempts: 0, progress: 0, createdAt: isoMinutesAgo(8), updatedAt: isoMinutesAgo(8), payloadSummary: 'Send invite follow-up email', worker: 'worker-3' },
    { id: 'job-9004', type: 'recording.transcode', state: 'succeeded', attempts: 1, progress: 100, createdAt: isoMinutesAgo(140), updatedAt: isoMinutesAgo(70), startedAt: isoMinutesAgo(139), finishedAt: isoMinutesAgo(70), payloadSummary: 'Transcode replay assets', worker: 'worker-4' },
    { id: 'job-9005', type: 'audit.forward', state: 'canceled', attempts: 2, progress: 100, createdAt: isoMinutesAgo(260), updatedAt: isoMinutesAgo(120), startedAt: isoMinutesAgo(255), finishedAt: isoMinutesAgo(120), payloadSummary: 'Forward audit batch to SIEM', worker: 'worker-1' },
  ];

  const state = params.state ?? '';
  const filtered = jobs.filter((job) => !state || job.state === state);
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), total: filtered.length };
}

const mockCurrentUserProfile: CurrentUserProfile = {
  id: 'user-1',
  displayName: 'Sarah Chen',
  email: 'sarah@codeforge.dev',
  title: 'Platform Lead',
  phone: '+1 (555) 420-0148',
  timezone: 'America/Los_Angeles',
  twoFactorEnabled: true,
};

const mockApiKeys: ApiKey[] = [
  { id: 'key-1', name: 'Production CI', prefix: 'cf_pk_live_7f9a', createdAt: isoMinutesAgo(3_400), lastUsedAt: isoMinutesAgo(18) },
  { id: 'key-2', name: 'Analytics Export', prefix: 'cf_pk_live_1e2b', createdAt: isoMinutesAgo(8_900), lastUsedAt: isoMinutesAgo(114) },
];

const mockOrgSettings: OrgSettings = {
  id: 'org-1',
  name: 'Code Forge',
  retentionDays: 90,
  auditForwarding: true,
  allowGuestAccess: false,
  timezone: 'UTC',
  slackWebhookEnabled: true,
};

const mockMetricsErrors: MetricsErrorItem[] = [
  { id: 'err-1', service: 'execution', message: 'Sandbox timed out after 10s', count: 42, lastSeenAt: isoMinutesAgo(14) },
  { id: 'err-2', service: 'replay', message: 'Recording stream closed early', count: 9, lastSeenAt: isoMinutesAgo(44) },
  { id: 'err-3', service: 'auth', message: 'Refresh token rejected', count: 5, lastSeenAt: isoMinutesAgo(63) },
];

const mockTopProblems: TopProblemItem[] = [
  { id: 'prob-top-1', title: 'Two Sum', submissions: 183, acceptanceRate: 71 },
  { id: 'prob-top-2', title: 'Merge K Sorted Lists', submissions: 129, acceptanceRate: 43 },
  { id: 'prob-top-3', title: 'Longest Substring', submissions: 101, acceptanceRate: 55 },
];

/* ── Helpers ── */
async function fetchJSON<T>(url: string, fallback: T, options?: RequestInit): Promise<T> {
  return requestJSON<T>(
    {
      url,
      method: options?.method ?? 'GET',
      data: options?.body ? JSON.parse(options.body as string) : undefined,
      headers: options?.headers as Record<string, string> | undefined,
    },
    fallback,
  );
}

async function postJSON<T>(url: string, body: unknown, fallback: T): Promise<T> {
  return fetchJSON(url, fallback, { method: 'POST', body: JSON.stringify(body) });
}

async function putJSON<T>(url: string, body: unknown, fallback: T): Promise<T> {
  return fetchJSON(url, fallback, { method: 'PUT', body: JSON.stringify(body) });
}

async function deleteJSON<T>(url: string, fallback: T): Promise<T> {
  return fetchJSON(url, fallback, { method: 'DELETE' });
}

export interface ProblemsPageParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface DashboardOverviewPayload {
  overview: DashboardOverview;
  recentSessions: InterviewSession[];
  recentProblems: ProblemListItem[];
  usage: UsageMetrics;
}

export async function fetchDashboardOverview(range = '7d'): Promise<DashboardOverviewPayload> {
  return requestApi('/dashboard/overview', {
    overview: mockDashboardOverview,
    recentSessions: mockSessions.slice(0, 5),
    recentProblems: mockProblemListItems.slice(0, 5),
    usage: { ...mockUsageMetrics, range },
  }, {
    params: { range },
  });
}

export async function fetchProblemsPage(params: ProblemsPageParams = {}): Promise<ProblemListResponse> {
  const fallback = applyProblemFilters(mockProblemListItems, {
    q: params.q,
    page: params.page,
    pageSize: params.pageSize,
  });

  return requestApi('/problems', fallback, {
    params: {
      q: params.q,
      page: params.page,
      pageSize: params.pageSize,
    },
  });
}

export async function fetchProblemDetail(problemId: string): Promise<Problem | null> {
  return requestApi(`/problems/${problemId}`, mockProblems.find((problem) => problem.id === problemId) ?? null);
}

export async function fetchRunExecution(payload: {
  problemId: string;
  code: string;
  language: Language;
  stdin?: string;
}): Promise<ExecutionRunResult> {
  return requestApi('/execution/run', {
    runId: `run-${Date.now()}`,
    status: 'COMPLETED',
    stdout: '',
    stderr: '',
    tests: [],
  }, {
    method: 'POST',
    data: payload,
  });
}

export async function fetchStartInterview(payload: {
  problemId: string;
  participantIds: string[];
  mode: 'live' | 'pair' | 'practice';
}): Promise<{ sessionId: string; joinUrl: string }> {
  const sessionId = `sess-${Date.now()}`;

  return requestApi('/interviews/start', {
    sessionId,
    joinUrl: `/sessions/${sessionId}`,
  }, {
    method: 'POST',
    data: payload,
  });
}

/* ── Health ── */
export async function getHealthCheck(): Promise<{ status: string; app: string; uptime: number }> {
  return requestJSON({ url: '/health', method: 'GET', baseURL: '' }, { status: 'ok', app: 'codeforge', uptime: 0 });
}

/* ── Problems ── */
export async function getProblems(): Promise<Problem[]> {
  return fetchJSON(`${API_BASE}/problems`, mockProblems);
}

function applyProblemFilters(items: ProblemListItem[], params: {
  q?: string;
  tags?: string[];
  difficulty?: string;
  author?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}): ProblemListResponse {
  const {
    q = '',
    tags = [],
    difficulty = '',
    author = '',
    page = 1,
    pageSize = 10,
    sort = 'updated_desc',
  } = params;

  const lowered = q.toLowerCase();
  const authorLower = author.toLowerCase();
  const filtered = items.filter((item) => {
    const matchesSearch = !lowered || item.title.toLowerCase().includes(lowered);
    const matchesDifficulty = !difficulty || item.difficulty === difficulty;
    const matchesTags = tags.length === 0 || tags.every((tag) => item.tags.includes(tag));
    const matchesAuthor = !authorLower || item.author.toLowerCase().includes(authorLower);
    return matchesSearch && matchesDifficulty && matchesTags && matchesAuthor;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'title_asc') return a.title.localeCompare(b.title);
    if (sort === 'title_desc') return b.title.localeCompare(a.title);
    if (sort === 'updated_asc') return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const start = (page - 1) * pageSize;
  const paged = sorted.slice(start, start + pageSize);
  return { items: paged, total: filtered.length };
}

export async function getProblemsList(params: {
  q?: string;
  tags?: string[];
  difficulty?: string;
  author?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}): Promise<ProblemListResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.difficulty) searchParams.set('difficulty', params.difficulty);
  if (params.author) searchParams.set('author', params.author);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.tags && params.tags.length > 0) {
    params.tags.forEach((tag) => searchParams.append('tags', tag));
  }

  const fallback = applyProblemFilters(mockProblemListItems, params);
  const query = searchParams.toString();
  const url = query ? `${API_BASE}/problems?${query}` : `${API_BASE}/problems`;
  return fetchJSON(url, fallback);
}

export async function getProblemById(problemId: string): Promise<Problem | null> {
  const fallback = mockProblems.find((p) => p.id === problemId) ?? null;
  return fetchJSON(`${API_BASE}/problems/${problemId}`, fallback);
}

export async function getProblemDetailById(problemId: string): Promise<Problem | null> {
  const fallback = mockProblems.find((p) => p.id === problemId);
  return fetchJSON(
    `${API_BASE}/api/problems/${problemId}`,
    fallback ? buildProblemDetailFallback(fallback) : null,
  );
}

export async function getProblemSolutions(problemId: string, language: string): Promise<Array<{ language: string; code: string; title?: string }>> {
  const fallback = [
    {
      language,
      title: 'Template Solution',
      code: language === 'python'
        ? 'def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n'
        : 'function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n}\n',
    },
  ];
  return fetchJSON(`${API_BASE}/api/problems/${problemId}/solutions?lang=${encodeURIComponent(language)}`, fallback);
}

export async function getProblemHints(problemId: string): Promise<string[]> {
  return fetchJSON(`${API_BASE}/api/problems/${problemId}/hints`, [
    'Try identifying the invariant that remains true while scanning input.',
    'Can you trade extra memory for faster lookup?',
  ]);
}

export async function bookmarkProblem(problemId: string): Promise<{ bookmarked: boolean }> {
  return postJSON(`${API_BASE}/api/problems/${problemId}/bookmark`, {}, { bookmarked: true });
}

export async function createProblem(payload: {
  title: string;
  statement: string;
  samples?: string;
  tags?: string[];
  difficulty: string;
  template?: string;
}): Promise<ProblemListItem> {
  const fallback: ProblemListItem = {
    id: `prob-${Date.now()}`,
    title: payload.title,
    slug: payload.title.toLowerCase().replace(/\s+/g, '-'),
    difficulty: payload.difficulty as ProblemListItem['difficulty'],
    tags: payload.tags ?? [],
    author: 'You',
    updatedAt: new Date().toISOString(),
  };
  return postJSON(`${API_BASE}/problems`, payload, fallback);
}

export async function updateProblem(problemId: string, payload: {
  title: string;
  statement: string;
  samples?: string;
  tags?: string[];
  difficulty: string;
  template?: string;
}): Promise<ProblemListItem> {
  const fallback: ProblemListItem = {
    id: problemId,
    title: payload.title,
    slug: payload.title.toLowerCase().replace(/\s+/g, '-'),
    difficulty: payload.difficulty as ProblemListItem['difficulty'],
    tags: payload.tags ?? [],
    author: 'You',
    updatedAt: new Date().toISOString(),
  };
  return putJSON(`${API_BASE}/problems/${problemId}`, payload, fallback);
}

export async function deleteProblem(problemId: string): Promise<{ ok: boolean }> {
  return deleteJSON(`${API_BASE}/problems/${problemId}`, { ok: true });
}

export async function bulkDeleteProblems(ids: string[]): Promise<{ deletedCount: number }> {
  return postJSON(`${API_BASE}/problems/bulk-delete`, { ids }, { deletedCount: ids.length });
}

export async function getProblemBySlug(slug: string): Promise<Problem | undefined> {
  const problems = await getProblems();
  return problems.find((p) => p.slug === slug);
}

/* ── Sessions (legacy list endpoint) ── */
export async function getSessions(): Promise<InterviewSession[]> {
  return fetchJSON(`${API_BASE}/interviews`, mockSessions);
}

export async function createSession(
  title: string,
  problemId?: string,
  scheduledAt?: string,
): Promise<InterviewSession> {
  const mockSession: InterviewSession = {
    id: `sess-${Date.now()}`,
    title,
    creatorId: 'mock-user-001',
    creatorName: 'You',
    status: 'SCHEDULED',
    scheduledAt: scheduledAt ?? new Date().toISOString(),
    participantCount: 1,
  };
  return postJSON(
    `${API_BASE}/interviews`,
    { title, problemId: problemId ?? '33333333-3333-3333-3333-333333333333', scheduledAt },
    mockSession,
  );
}

export async function updateSessionStatus(sessionId: string, status: string): Promise<{ ok: boolean }> {
  return putJSON(`${API_BASE}/interviews/${sessionId}/status`, { status }, { ok: true });
}

/* ── Dashboard ── */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return fetchJSON(`${API_BASE}/dashboard/metrics`, mockDashboardMetrics);
}

export async function getDashboardOverview(range = '7d'): Promise<DashboardOverview> {
  return fetchJSON(`${API_BASE}/dashboard/overview?range=${range}`, {
    ...mockDashboardOverview,
    trendSeries: mockDashboardOverview.trendSeries,
  });
}

export async function getRecentInterviews(limit = 5): Promise<InterviewSession[]> {
  return fetchJSON(`${API_BASE}/interviews/recent?limit=${limit}`, mockSessions.slice(0, limit));
}

export async function getRecentProblems(limit = 5): Promise<ProblemListItem[]> {
  return fetchJSON(`${API_BASE}/problems/recent?limit=${limit}`, mockProblemListItems.slice(0, limit));
}

export async function getUsageMetrics(range = '7d'): Promise<UsageMetrics> {
  return fetchJSON(`${API_BASE}/metrics/usage?range=${range}`, {
    ...mockUsageMetrics,
    range,
  });
}

export async function getMetricsErrors(service = 'execution'): Promise<MetricsErrorItem[]> {
  return fetchJSON(`${API_BASE}/metrics/errors?service=${encodeURIComponent(service)}`, mockMetricsErrors.filter((item) => item.service === service || service === 'execution'));
}

export async function getTopProblems(): Promise<TopProblemItem[]> {
  return fetchJSON(`${API_BASE}/metrics/top-problems`, mockTopProblems);
}

export async function getSessionReplay(sessionId: string): Promise<SessionReplayData> {
  return fetchJSON(`${API_BASE}/api/interviews/${sessionId}/replay`, buildReplayFallback(sessionId));
}

export async function saveReplayNote(sessionId: string, note: string): Promise<ReplayNote> {
  return postJSON(`${API_BASE}/api/interviews/${sessionId}/notes`, { note }, {
    id: `${sessionId}-note-${Date.now()}`,
    author: 'You',
    note,
    timestamp: new Date().toISOString(),
    timeMs: 0,
  });
}

export async function getUsers(params: { page?: number; role?: string; q?: string }): Promise<UserListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.role) searchParams.set('role', params.role);
  if (params.q) searchParams.set('q', params.q);
  const query = searchParams.toString();
  return fetchJSON(`${API_BASE}/api/users${query ? `?${query}` : ''}`, buildUsersFallback(params));
}

export async function inviteUser(payload: { email: string; role: Role }): Promise<TeamUser> {
  return postJSON(`${API_BASE}/api/users/invite`, payload, {
    id: `user-${Date.now()}`,
    email: payload.email,
    displayName: payload.email.split('@')[0],
    role: payload.role,
    status: 'INVITED',
    lastActiveAt: isoMinutesAgo(0),
  });
}

export async function updateUser(userId: string, payload: Partial<Pick<TeamUser, 'role' | 'status' | 'displayName'>>): Promise<TeamUser> {
  return putJSON(`${API_BASE}/api/users/${userId}`, payload, {
    id: userId,
    email: `${userId}@codeforge.dev`,
    displayName: payload.displayName ?? 'Team Member',
    role: (payload.role ?? 'INTERVIEWER') as Role,
    status: (payload.status ?? 'ACTIVE') as TeamUser['status'],
    lastActiveAt: isoMinutesAgo(10),
  });
}

export async function deleteUser(userId: string): Promise<{ ok: boolean }> {
  return deleteJSON(`${API_BASE}/api/users/${userId}`, { ok: true });
}

export async function getUserActivity(userId: string): Promise<UserActivityItem[]> {
  return fetchJSON(`${API_BASE}/api/users/${userId}/activity`, [
    { id: `${userId}-act-1`, timestamp: isoMinutesAgo(18), action: 'Updated role', details: 'Changed from candidate to interviewer.' },
    { id: `${userId}-act-2`, timestamp: isoMinutesAgo(71), action: 'Joined interview', details: 'Participated in a frontend pairing session.' },
    { id: `${userId}-act-3`, timestamp: isoMinutesAgo(180), action: 'API key created', details: 'Created Production CI token.' },
  ]);
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile> {
  return fetchJSON(`${API_BASE}/api/users/me`, mockCurrentUserProfile);
}

export async function updateCurrentUserProfile(payload: Partial<CurrentUserProfile>): Promise<CurrentUserProfile> {
  return putJSON(`${API_BASE}/api/users/me`, payload, { ...mockCurrentUserProfile, ...payload });
}

export async function createApiKey(payload: { name: string }): Promise<ApiKey & { secret: string }> {
  return postJSON(`${API_BASE}/api/users/me/keys`, payload, {
    id: `key-${Date.now()}`,
    name: payload.name,
    prefix: 'cf_pk_live_mock',
    createdAt: new Date().toISOString(),
    secret: `cf_pk_live_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
  });
}

export async function getApiKeys(): Promise<ApiKey[]> {
  return fetchJSON(`${API_BASE}/api/users/me/keys`, mockApiKeys);
}

export async function deleteApiKey(keyId: string): Promise<{ ok: boolean }> {
  return deleteJSON(`${API_BASE}/api/users/me/keys/${keyId}`, { ok: true });
}

export async function getOrgSettings(orgId: string): Promise<OrgSettings> {
  return fetchJSON(`${API_BASE}/api/orgs/${orgId}/settings`, mockOrgSettings);
}

export async function updateOrgSettings(orgId: string, payload: Partial<OrgSettings>): Promise<OrgSettings> {
  return putJSON(`${API_BASE}/api/orgs/${orgId}/settings`, payload, { ...mockOrgSettings, ...payload, id: orgId });
}

export async function getQueueJobs(params: { state?: string; page?: number }): Promise<QueueJobsResponse> {
  const searchParams = new URLSearchParams();
  if (params.state) searchParams.set('state', params.state);
  if (params.page) searchParams.set('page', String(params.page));
  const query = searchParams.toString();
  return fetchJSON(`${API_BASE}/api/queue/jobs${query ? `?${query}` : ''}`, buildQueueFallback(params));
}

export async function getQueueJobLogs(jobId: string): Promise<QueueJobLog[]> {
  return fetchJSON(`${API_BASE}/api/queue/jobs/${jobId}/logs`, [
    { id: `${jobId}-log-1`, timestamp: isoMinutesAgo(28), level: 'info', message: 'Job enqueued and picked by worker-2.' },
    { id: `${jobId}-log-2`, timestamp: isoMinutesAgo(20), level: 'info', message: 'Payload validated and execution started.' },
    { id: `${jobId}-log-3`, timestamp: isoMinutesAgo(2), level: 'warn', message: 'Transient timeout encountered; retry scheduled.' },
  ]);
}

export async function retryQueueJob(jobId: string): Promise<{ ok: boolean; state: QueueJob['state'] }> {
  return postJSON(`${API_BASE}/api/queue/jobs/${jobId}/retry`, {}, { ok: true, state: 'queued' });
}

export async function cancelQueueJob(jobId: string): Promise<{ ok: boolean; state: QueueJob['state'] }> {
  return postJSON(`${API_BASE}/api/queue/jobs/${jobId}/cancel`, {}, { ok: true, state: 'canceled' });
}

/* ── Submissions ── */
export async function getRecentSubmissions(): Promise<Submission[]> {
  return fetchJSON(`${API_BASE}/submissions`, mockSubmissions);
}

export async function submitCode(
  problemId: string,
  language: string,
  code: string,
  sessionId?: string,
): Promise<Submission> {
  const mockResult: Submission = {
    id: `sub-${Date.now()}`,
    userId: 'mock-user-001',
    problemId,
    language: language as Submission['language'],
    verdict: 'PENDING',
    submittedAt: new Date().toISOString(),
  };
  return postJSON(`${API_BASE}/submissions`, { problemId, language, code, sessionId }, mockResult);
}

export async function runProblemExecution(payload: {
  problemId: string;
  code: string;
  language: string;
  stdin?: string;
  sessionContext?: { sessionId?: string };
}): Promise<ExecutionRunResult> {
  return postJSON(`${API_BASE}/api/execution/run`, payload, {
    runId: `run-${Date.now()}`,
    status: 'COMPLETED',
    stdout: 'Execution completed successfully.',
    stderr: '',
    tests: [
      { id: 't1', name: 'Sample 1', status: 'PASSED', runtimeMs: 14 },
      { id: 't2', name: 'Sample 2', status: 'PASSED', runtimeMs: 18 },
    ],
    runtimeMs: 32,
    createdAt: new Date().toISOString(),
  });
}

export async function getExecutionRunStatus(runId: string): Promise<ExecutionRunResult> {
  return fetchJSON(`${API_BASE}/api/execution/run/${runId}`, {
    runId,
    status: 'COMPLETED',
    stdout: 'Execution completed successfully.',
    stderr: '',
    tests: [
      { id: 't1', name: 'Sample 1', status: 'PASSED', runtimeMs: 14 },
      { id: 't2', name: 'Sample 2', status: 'PASSED', runtimeMs: 18 },
    ],
    runtimeMs: 32,
    createdAt: new Date().toISOString(),
  });
}

/* ── Interviews (advanced CRUD) ── */
export async function getInterviews(limit = 10, offset = 0): Promise<InterviewSession[]> {
  return fetchJSON(`${API_BASE}/interviews?limit=${limit}&offset=${offset}`, mockSessions);
}

export async function getInterview(sessionId: string): Promise<InterviewSession | null> {
  const fallback = mockSessions.find((s) => s.id === sessionId) ?? null;
  return fetchJSON(`${API_BASE}/interviews/${sessionId}`, fallback);
}

export async function endInterview(sessionId: string): Promise<{ ok: boolean }> {
  return postJSON(`${API_BASE}/interviews/${sessionId}/end`, {}, { ok: true });
}

export async function startInterviewFromProblem(payload: {
  problemId: string;
  participantIds: string[];
  mode: 'live' | 'pair' | 'practice';
}): Promise<{ sessionId: string; joinUrl: string }> {
  const fallbackSessionId = `sess-${Date.now()}`;
  return postJSON(`${API_BASE}/api/interviews/start`, payload, {
    sessionId: fallbackSessionId,
    joinUrl: `/sessions/${fallbackSessionId}`,
  });
}

export async function joinInterviewSession(
  sessionId: string,
  payload: { userId: string; role: 'INTERVIEWER' | 'CANDIDATE' | 'OBSERVER' },
): Promise<InterviewJoinResponse> {
  return postJSON(`${API_BASE}/api/interviews/${sessionId}/join`, payload, {
    sessionToken: `session-token-${Date.now()}`,
    rtcConfig: {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      turnRequired: false,
    },
  });
}

export async function saveInterviewNote(sessionId: string, note: string): Promise<{ saved: boolean; note: string }> {
  return postJSON(`${API_BASE}/api/interviews/${sessionId}/notes`, { note }, { saved: true, note });
}

export async function submitInterviewRatings(
  sessionId: string,
  payload: { scores: Record<string, number>; feedback: string },
): Promise<{ saved: boolean }> {
  return postJSON(`${API_BASE}/api/interviews/${sessionId}/ratings`, payload, { saved: true });
}

/* ── Session Links ── */
export async function createSessionLink(
  sessionId: string,
  role: SessionRole,
  expiresIn?: number,
): Promise<SessionLink> {
  const mockLink: SessionLink = {
    id: `link-${Date.now()}`,
    sessionId,
    token: `tok-${Math.random().toString(36).slice(2)}`,
    role,
    isRevoked: false,
    createdAt: new Date().toISOString(),
  };
  return postJSON(`${API_BASE}/interviews/${sessionId}/links`, { role, expiresIn }, mockLink);
}

export async function getSessionLinks(sessionId: string): Promise<SessionLink[]> {
  return fetchJSON(`${API_BASE}/interviews/${sessionId}/links`, []);
}

export async function revokeSessionLink(linkId: string): Promise<SessionLink> {
  return deleteJSON(`${API_BASE}/interviews/links/${linkId}`, {
    id: linkId, sessionId: '', token: '', role: 'CANDIDATE' as SessionRole, isRevoked: true, createdAt: '',
  });
}

export async function joinSessionWithToken(token: string): Promise<InterviewSession | null> {
  return postJSON(`${API_BASE}/interviews/join`, { token }, null);
}

/* ── Scorecard ── */
export async function submitScorecard(
  sessionId: string,
  data: {
    problemSolving: number;
    communication: number;
    debugging: number;
    codeQuality: number;
    timeManagement: number;
    testingApproach: number;
    feedback?: string;
    overallRating?: number;
  },
): Promise<Scorecard | null> {
  return postJSON(`${API_BASE}/interviews/${sessionId}/scorecard`, data, null);
}

export async function getScorecard(sessionId: string): Promise<Scorecard | null> {
  return fetchJSON(`${API_BASE}/interviews/${sessionId}/scorecard`, null);
}

export async function getAllScorecards(sessionId: string): Promise<Scorecard[]> {
  return fetchJSON(`${API_BASE}/interviews/${sessionId}/scorecards`, []);
}

export async function getScorecardReport(sessionId: string): Promise<ScorecardReport | null> {
  return fetchJSON(`${API_BASE}/interviews/${sessionId}/scorecard-report`, null);
}

/* ── Anti-Cheat ── */
export async function getAntiCheatEvents(sessionId: string): Promise<AntiCheatEvent[]> {
  return fetchJSON(`${API_BASE}/interviews/${sessionId}/anti-cheat/events`, []);
}

export async function getAntiCheatReport(sessionId: string): Promise<AntiCheatParticipantReport[]> {
  return fetchJSON(`${API_BASE}/interviews/${sessionId}/anti-cheat/report`, []);
}

/* ── Recording Artifacts ── */
export async function getRecording(sessionId: string): Promise<SessionRecording | null> {
  return fetchJSON(`${API_BASE}/interviews/${sessionId}/recording`, null);
}

export async function getRecordingArtifacts(sessionId: string): Promise<RecordingArtifact[]> {
  return fetchJSON(`${API_BASE}/interviews/${sessionId}/recordings/artifacts`, []);
}

export async function uploadRecordingArtifactMetadata(
  sessionId: string,
  data: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    source: 'webcam' | 'screen';
    durationMs?: number;
    storageUrl?: string;
  },
): Promise<RecordingArtifact | null> {
  return postJSON(`${API_BASE}/interviews/${sessionId}/recordings/artifacts`, data, null);
}

/* ── Report ── */
export async function createReport(sessionId: string): Promise<InterviewReport | null> {
  return postJSON(`${API_BASE}/interviews/${sessionId}/report`, {}, null);
}

export async function getReport(sessionId: string): Promise<InterviewReport | null> {
  return fetchJSON(`${API_BASE}/interviews/${sessionId}/report`, null);
}

export async function extendShareLink(
  sessionId: string,
  expiresIn?: number,
): Promise<InterviewReport | null> {
  return postJSON(`${API_BASE}/interviews/${sessionId}/report/extend-share`, { expiresIn }, null);
}

export async function revokeShareLink(sessionId: string): Promise<InterviewReport | null> {
  return postJSON(`${API_BASE}/interviews/${sessionId}/report/revoke-share`, {}, null);
}

export async function getPublicReport(token: string): Promise<{ sessionId: string; generatedAt: string; summary?: string } | null> {
  return fetchJSON(`${API_BASE}/interviews/public/report/${token}`, null);
}

/* ── Export ── */
export async function exportInterview(
  sessionId: string,
  format: 'PDF' | 'JSON',
  includeRecording = false,
): Promise<unknown> {
  return postJSON(`${API_BASE}/interviews/${sessionId}/export`, { format, includeRecording }, null);
}

/* ── AI Code Analysis ── */
export async function runAICodeReview(
  sessionId: string,
  code: string,
  language: string,
): Promise<AIReviewResult | null> {
  return postJSON(`${API_BASE}/interviews/${sessionId}/code-review`, { code, language }, null);
}

export async function analyzeComplexity(
  sessionId: string,
  code: string,
): Promise<ComplexityResult | null> {
  return postJSON(`${API_BASE}/interviews/${sessionId}/complexity`, { code }, null);
}

/* ── Analytics ── */
export async function getAnalyticsDashboard(days = 14): Promise<AnalyticsDashboardData | null> {
  return fetchJSON(`${API_BASE}/interviews/analytics/dashboard?days=${days}`, null);
}

/* ── Webhooks ── */
export async function getWebhooks(): Promise<{ webhooks: Webhook[] }> {
  return fetchJSON(`${API_BASE}/webhooks`, { webhooks: [] });
}

export async function registerWebhook(url: string, events: string[]): Promise<Webhook> {
  return postJSON(`${API_BASE}/webhooks`, { url, events }, { id: `wh-${Date.now()}`, url, events });
}

export async function deleteWebhook(id: string): Promise<{ ok: boolean }> {
  return deleteJSON(`${API_BASE}/webhooks/${id}`, { ok: true });
}

/* ── Operator ── */
export async function getOperatorDLQ(): Promise<unknown> {
  return requestJSON({ url: '/operator/dlq', method: 'GET', baseURL: '' }, null);
}

export async function getOperatorAuditLogs(tenant: string, limit = 200): Promise<unknown> {
  return requestJSON({ url: `/operator/audit/${tenant}?limit=${limit}`, method: 'GET', baseURL: '' }, null);
}

/* ── Auth ── */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds?: number;
  user?: { id: string; email: string; displayName: string; avatarUrl?: string; role?: string };
  userSummary?: { id: string; email: string; displayName: string; avatarUrl?: string; role?: string };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return requestJSON<AuthResponse>({ url: '/auth/login', method: 'POST', data: { email, password } }, {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresInSeconds: 3600,
    userSummary: { id: 'mock-user-001', email, displayName: email.split('@')[0], role: 'CANDIDATE' },
  });
}

export async function register(email: string, password: string, displayName: string): Promise<AuthResponse> {
  return requestJSON<AuthResponse>({ url: '/auth/register', method: 'POST', data: { email, password, displayName } }, {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresInSeconds: 3600,
    userSummary: { id: 'mock-user-002', email, displayName, role: 'CANDIDATE' },
  });
}
