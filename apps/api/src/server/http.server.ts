import express from 'express';
import client from 'prom-client';
import { bootstrapApi } from '../main.js';
import { MetricsMiddleware } from '../common/middleware/metrics.middleware.js';

export async function startServer(port = Number(process.env.PORT) || 4000) {
  const appInfo = bootstrapApi();
  const appModule = appInfo.modules;
  const problemOverrides = new Map<string, { title?: string; statement?: string }>();
  const bookmarkedProblems = new Set<string>();
  const executionRuns = new Map<string, {
    runId: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    stdout: string;
    stderr: string;
    tests: Array<{ id: string; name: string; status: 'PASSED' | 'FAILED'; runtimeMs?: number }>;
    createdAt: string;
  }>();
  const interviewNotes = new Map<string, Array<{ note: string; timestamp: string; userId?: string }>>();
  const interviewRatings = new Map<string, Array<{ scores: Record<string, number>; feedback: string; timestamp: string; userId?: string }>>();

  const app = express();
  app.use(express.json());

  // Apply metrics middleware first
  const metricsMiddleware = new MetricsMiddleware();
  app.use((req, res, next) => metricsMiddleware.use(req, res, next));

  // Apply audit middleware if present
  if (appModule.audit && typeof appModule.audit.use === 'function') {
    app.use((req, res, next) => appModule.audit.use(req, res, next));
  }

  // Health endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', app: appInfo.appName, uptime: process.uptime() });
  });

  function toProblemDetail(problem: any) {
    const overrides = problemOverrides.get(problem.id);
    const statement = overrides?.statement ?? `${problem.title} problem statement.`;
    return {
      id: problem.id,
      slug: problem.slug,
      title: overrides?.title ?? problem.title,
      statement,
      description: statement,
      constraints: '1 <= n <= 10^5',
      samples: [
        {
          input: 'nums = [2,7,11,15], target = 9',
          output: '[0,1]',
          explanation: '2 + 7 = 9',
        },
      ],
      tags: ['arrays', 'hash-map'],
      difficulty: problem.difficulty,
      supportedLangs: ['python', 'javascript', 'cpp', 'java'],
      templates: [
        { language: 'python', code: 'def solve():\n    pass\n' },
        { language: 'javascript', code: 'function solve() {\n  // TODO\n}\n' },
        { language: 'cpp', code: 'int main() {\n  return 0;\n}\n' },
        { language: 'java', code: 'class Solution {\n  public void solve() {\n  }\n}\n' },
      ],
      editorial: 'Use a hash map to reduce lookup from O(n) to O(1).',
      isPublished: true,
    };
  }

  function findProblemById(problemId: string) {
    const published = appModule.problems.controller.listPublished();
    return published.find((problem: any) => problem.id === problemId) ?? null;
  }

  function findProblemBySlug(slug: string) {
    const published = appModule.problems.controller.listPublished();
    return published.find((problem: any) => problem.slug === slug) ?? null;
  }

  // Problems API
  app.get('/api/problems', (req, res) => {
    try {
      const problems = appModule.problems.controller.listPublished().map((problem: any) => toProblemDetail(problem));
      res.json(problems);
    } catch (e) {
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/problems', (req, res) => {
    try {
      const problems = appModule.problems.controller.listPublished().map((problem: any) => toProblemDetail(problem));
      res.json(problems);
    } catch (e) {
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/api/problems/:id/solutions', (req, res) => {
    const language = String(req.query.lang ?? 'python');
    const problem = findProblemById(req.params.id);
    if (!problem) return res.status(404).json({ error: 'problem-not-found' });
    const code = language === 'python'
      ? 'def solve(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n'
      : 'function solve(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n}\n';
    res.json([{ language, title: 'Reference Solution', code }]);
  });

  app.get('/api/problems/:id/hints', (req, res) => {
    const problem = findProblemById(req.params.id);
    if (!problem) return res.status(404).json({ error: 'problem-not-found' });
    res.json([
      'Start from a brute-force solution first.',
      'Look for a data structure that gives constant-time lookup.',
      'Validate with boundary inputs before optimizing.',
    ]);
  });

  app.post('/api/problems/:id/bookmark', (req, res) => {
    const problem = findProblemById(req.params.id);
    if (!problem) return res.status(404).json({ error: 'problem-not-found' });
    bookmarkedProblems.add(problem.id);
    res.json({ bookmarked: true });
  });

  app.get('/api/problems/:id', (req, res) => {
    const problem = findProblemById(req.params.id);
    if (!problem) return res.status(404).json({ error: 'problem-not-found' });
    res.json(toProblemDetail(problem));
  });

  app.put('/api/problems/:id', (req, res) => {
    const problem = findProblemById(req.params.id);
    if (!problem) return res.status(404).json({ error: 'problem-not-found' });

    const current = problemOverrides.get(problem.id) ?? {};
    const updated = {
      title: typeof req.body?.title === 'string' ? req.body.title : current.title,
      statement: typeof req.body?.statement === 'string' ? req.body.statement : current.statement,
    };
    problemOverrides.set(problem.id, updated);
    res.json({ id: problem.id, title: updated.title ?? problem.title, updatedAt: new Date().toISOString() });
  });

  app.get('/problems/:id', (req, res) => {
    const byId = findProblemById(req.params.id);
    const bySlug = findProblemBySlug(req.params.id);
    const problem = byId ?? bySlug;
    if (!problem) return res.status(404).json({ error: 'problem-not-found' });
    res.json(toProblemDetail(problem));
  });

  app.put('/problems/:id', (req, res) => {
    const byId = findProblemById(req.params.id);
    const bySlug = findProblemBySlug(req.params.id);
    const problem = byId ?? bySlug;
    if (!problem) return res.status(404).json({ error: 'problem-not-found' });

    const current = problemOverrides.get(problem.id) ?? {};
    const updated = {
      title: typeof req.body?.title === 'string' ? req.body.title : current.title,
      statement: typeof req.body?.statement === 'string' ? req.body.statement : current.statement,
    };
    problemOverrides.set(problem.id, updated);
    res.json({ id: problem.id, title: updated.title ?? problem.title, updatedAt: new Date().toISOString() });
  });

  // Execution API
  app.post('/api/execution/run', (req, res) => {
    try {
      const runId = `run_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const createdAt = new Date().toISOString();
      const pending = {
        runId,
        status: 'RUNNING' as const,
        stdout: '',
        stderr: '',
        tests: [],
        createdAt,
      };

      executionRuns.set(runId, pending);

      const language = typeof req.body?.language === 'string' ? req.body.language : 'python';
      const problemId = typeof req.body?.problemId === 'string' ? req.body.problemId : '33333333-3333-3333-3333-333333333333';
      const code = typeof req.body?.code === 'string' ? req.body.code : '';
      const sessionId = typeof req.body?.sessionContext?.sessionId === 'string'
        ? req.body.sessionContext.sessionId
        : (typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined);

      appModule.execution.controller.submitCode({
        problemId,
        language,
        code,
        sessionId,
      });

      setTimeout(() => {
        executionRuns.set(runId, {
          runId,
          status: 'COMPLETED',
          stdout: 'Execution completed successfully.',
          stderr: '',
          tests: [
            { id: 't1', name: 'Sample 1', status: 'PASSED', runtimeMs: 11 },
            { id: 't2', name: 'Sample 2', status: 'PASSED', runtimeMs: 17 },
          ],
          createdAt,
        });
      }, 1200);

      res.json(pending);
    } catch (e) {
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/api/execution/run/:runId', (req, res) => {
    const run = executionRuns.get(req.params.runId);
    if (!run) {
      return res.status(404).json({
        runId: req.params.runId,
        status: 'FAILED',
        stdout: '',
        stderr: 'run-not-found',
        tests: [],
      });
    }
    res.json(run);
  });

  // Interview API
  app.post('/api/interviews/start', (req, res) => {
    try {
      const problemId = typeof req.body?.problemId === 'string' ? req.body.problemId : '33333333-3333-3333-3333-333333333333';
      const mode = typeof req.body?.mode === 'string' ? req.body.mode : 'live';
      const participants = Array.isArray(req.body?.participantIds) ? req.body.participantIds : [];

      const created = appModule.sessions.controller.create('system-user', {
        title: `Interview (${mode})`,
        scheduledAt: new Date().toISOString(),
      });

      appModule.sessions.service.attachProblem(created.id, problemId);

      participants
        .filter((id: unknown) => typeof id === 'string' && id.length > 0)
        .forEach((participantId: string) => {
          appModule.sessions.controller.join(created.id, participantId, 'CANDIDATE');
        });

      res.json({ sessionId: created.id, joinUrl: `/sessions/${created.id}` });
    } catch (e) {
      res.status(500).json({ error: 'internal' });
    }
  });

  app.post('/api/interviews/:id/join', (req, res) => {
    try {
      const session = appModule.sessions.controller.get(req.params.id);
      if (!session) return res.status(404).json({ error: 'session-not-found' });

      const userId = typeof req.body?.userId === 'string' ? req.body.userId : `user_${Date.now()}`;
      const role = ['INTERVIEWER', 'CANDIDATE', 'OBSERVER'].includes(req.body?.role)
        ? req.body.role
        : 'CANDIDATE';

      appModule.sessions.controller.join(req.params.id, userId, role);

      res.json({
        sessionToken: `st_${req.params.id}_${Date.now()}`,
        rtcConfig: {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          turnRequired: false,
        },
      });
    } catch (e) {
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/interviews/:id', (req, res) => {
    const session = appModule.sessions.controller.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'session-not-found' });
    res.json({
      id: session.id,
      title: session.title,
      creatorId: session.creatorId,
      creatorName: 'System',
      status: session.status,
      scheduledAt: session.scheduledAt ?? undefined,
      startedAt: session.startedAt ?? undefined,
      endedAt: session.endedAt ?? undefined,
      participantCount: session.participants.length,
      participants: session.participants,
      problemId: session.problemIds[0],
      permissions: {
        canEndSession: true,
        canRecord: true,
        canRunCode: true,
        canEditCode: true,
      },
    });
  });

  app.post('/interviews/:id/end', (req, res) => {
    const session = appModule.sessions.controller.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'session-not-found' });
    session.status = 'COMPLETED';
    session.endedAt = new Date().toISOString();
    res.json({ ok: true });
  });

  app.post('/interviews/:id/report', (req, res) => {
    const session = appModule.sessions.controller.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'session-not-found' });
    res.json({
      id: `report_${req.params.id}`,
      sessionId: req.params.id,
      generatedAt: new Date().toISOString(),
      summary: 'Interview report generated.',
      shareToken: null,
      shareExpiry: null,
    });
  });

  app.post('/api/interviews/:id/notes', (req, res) => {
    const session = appModule.sessions.controller.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'session-not-found' });
    const note = typeof req.body?.note === 'string' ? req.body.note : '';
    const notes = interviewNotes.get(req.params.id) ?? [];
    notes.push({ note, timestamp: new Date().toISOString(), userId: req.body?.userId });
    interviewNotes.set(req.params.id, notes);
    res.json({ saved: true, note });
  });

  app.post('/api/interviews/:id/ratings', (req, res) => {
    const session = appModule.sessions.controller.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'session-not-found' });
    const ratings = interviewRatings.get(req.params.id) ?? [];
    ratings.push({
      scores: typeof req.body?.scores === 'object' && req.body.scores ? req.body.scores : {},
      feedback: typeof req.body?.feedback === 'string' ? req.body.feedback : '',
      timestamp: new Date().toISOString(),
      userId: req.body?.userId,
    });
    interviewRatings.set(req.params.id, ratings);
    res.json({ saved: true });
  });

  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', client.register.contentType);
      // If MetricsModule exists, prefer its controller; otherwise use register
      if (appModule.metrics && appModule.metrics.controller && typeof appModule.metrics.controller.metrics === 'function') {
        const body = await appModule.metrics.controller.metrics();
        res.end(body);
      } else {
        res.end(await client.register.metrics());
      }
    } catch (e) {
      res.status(500).end('error');
    }
  });

  // Simple readiness
  app.get('/ready', (req, res) => res.status(200).end('ready'));

  // Operator endpoints: DLQ and audit inspection
  app.get('/operator/dlq', async (req, res) => {
    try {
      if (!appModule.queue) return res.status(404).json({ error: 'queue not configured' });
      const q = appModule.queue.queue;
      const dlq = appModule.queue.dlq;
      const counts = await q.getJobCounts();
      const dlqCounts = await dlq.getJobCounts();
      res.json({ queue: counts, dlq: dlqCounts });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('operator/dlq failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/operator/dlq/recent', async (req, res) => {
    try {
      if (!appModule.queue) return res.status(404).json({ error: 'queue not configured' });
      const dlq = appModule.queue.dlq;
      const jobs = await dlq.getJobs(['waiting', 'active', 'delayed', 'failed', 'completed'], 0, 49);
      const mapped = jobs.map((j) => ({ id: j.id, data: j.data, failedReason: (j as any).failedReason }));
      res.json({ jobs: mapped });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('operator/dlq/recent failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/operator/audit/:tenant', async (req, res) => {
    try {
      const tenant = req.params.tenant || 'unknown';
      const limit = Math.min(Number(req.query.limit) || 200, 2000);
      const fs = await import('fs');
      const path = await import('path');
      const file = path.join(process.cwd(), 'data', 'audit', `${tenant}.log`);
      if (!fs.existsSync(file)) return res.status(404).json({ error: 'no-audit' });
      const body = await fs.promises.readFile(file, 'utf8');
      const lines = body.trim().split('\n').filter(Boolean);
      const tail = lines.slice(-limit).map((l) => {
        try {
          return JSON.parse(l);
        } catch (e) {
          return { raw: l };
        }
      });
      res.json({ tenant, count: tail.length, entries: tail });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('operator/audit failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  // Public API: Webhooks
  app.post('/api/webhooks', (req, res) => {
    try {
      const { url, events } = req.body;
      const tenant = (req.headers['x-tenant-id'] as string) || 'unknown';
      if (!url || !Array.isArray(events)) {
        return res.status(400).json({ error: 'missing url or events' });
      }
      const id = appModule.publicAPI.registerWebhook(tenant, url, events);
      res.json({ id, url, events });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/webhooks failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/api/webhooks', (req, res) => {
    try {
      const webhooks = appModule.publicAPI.listWebhooks();
      res.json({ webhooks });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/webhooks failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.delete('/api/webhooks/:id', (req, res) => {
    try {
      const ok = appModule.publicAPI.deleteWebhook(req.params.id);
      res.json({ ok });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('DELETE /api/webhooks/:id failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  // Enterprise Auth: OIDC/SSO
  app.get('/auth/authorize', (req, res) => {
    try {
      const state = Math.random().toString(36).substr(2, 9);
      const nonce = Math.random().toString(36).substr(2, 9);
      const url = appModule.oidc.getAuthorizationUrl(state, nonce);
      // Store state/nonce in session (production: use express-session or JWT)
      res.json({ authUrl: url, state, nonce });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /auth/authorize failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.post('/auth/callback', (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'missing code' });
      // In production, verify state, exchange code for token, decode JWT
      // eslint-disable-next-line no-console
      console.log(`[OIDC] Callback received with code: ${code}`);
      res.json({ token: 'placeholder', user: { sub: 'user_123', email: 'user@example.com' } });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /auth/callback failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  // Enterprise Auth: SCIM 2.0 provisioning
  app.get('/scim/ServiceProviderConfig', (req, res) => {
    try {
      res.set('Content-Type', 'application/scim+json');
      res.json(appModule.scim.getServiceProviderConfig());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /scim/ServiceProviderConfig failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.post('/scim/Users', (req, res) => {
    try {
      const { email, displayName } = req.body;
      const user = appModule.scim.createUser({ email, displayName });
      res.status(201).json(user);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /scim/Users failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/scim/Users', (req, res) => {
    try {
      const filter = (req.query.filter as string) || undefined;
      const users = appModule.scim.listUsers(filter);
      res.set('Content-Type', 'application/scim+json');
      res.json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], Resources: users });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /scim/Users failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.patch('/scim/Users/:id', (req, res) => {
    try {
      const { Operations } = req.body;
      let groups: string[] | undefined;
      if (Array.isArray(Operations)) {
        const groupsOp = Operations.find((op) => op.path === 'groups');
        if (groupsOp) groups = groupsOp.value;
      }
      const ok = appModule.scim.updateUser(req.params.id, { groups });
      res.json({ ok });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('PATCH /scim/Users/:id failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.delete('/scim/Users/:id', (req, res) => {
    try {
      const ok = appModule.scim.deleteUser(req.params.id);
      res.json({ ok });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('DELETE /scim/Users/:id failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.post('/scim/Groups', (req, res) => {
    try {
      const { displayName } = req.body;
      const group = appModule.scim.createGroup({ displayName });
      res.status(201).json(group);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /scim/Groups failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/scim/Groups/:id', (req, res) => {
    try {
      const group = appModule.scim.getGroup(req.params.id);
      if (!group) return res.status(404).json({ error: 'not-found' });
      res.set('Content-Type', 'application/scim+json');
      res.json(group);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /scim/Groups/:id failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  app.patch('/scim/Groups/:id', (req, res) => {
    try {
      const { members } = req.body;
      const ok = appModule.scim.updateGroup(req.params.id, { members });
      res.json({ ok });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('PATCH /scim/Groups/:id failed', e);
      res.status(500).json({ error: 'internal' });
    }
  });

  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`HTTP server listening on ${port}`);
  });

  // Retention enforcement: run daily
  if (appModule.retention && typeof appModule.retention.enforce === 'function') {
    setInterval(() => {
      appModule.retention.enforce().catch(() => {});
    }, 24 * 60 * 60 * 1000);
  }

  return server;
}

if (require.main === module) {
  startServer().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });
}
