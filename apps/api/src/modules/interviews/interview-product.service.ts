
import type {
  BenchmarkSummary,
  BillingPlan,
  BillingSummary,
  CalibrationDashboard,
  CandidateSkillGraph,
  DebugAnnotation,
  DebugExecution,
  DebugSession,
  EvidenceTrail,
  EvidenceTrailItem,
  IntegrationConnection,
  IntegrationProvider,
  InterviewTemplate,
  InterviewTemplateRole,
  InterviewerBiasSignal,
  QualityAnalytics,
  RubricDraft,
  SkillNode,
} from '@codeforge/shared';
import { ScorecardService } from './scorecard.service.js';
import { RecordingService } from './recording.service.js';
import { AntiCheatService } from './anti-cheat.service.js';

type TemplateInput = {
  title: string;
  role: InterviewTemplateRole;
  level?: string;
  problemIds?: string[];
  durationMinutes?: number;
  tags?: string[];
  rubricNotes?: string[];
  isPrivate?: boolean;
  createdBy: string;
};

type RubricDraftInput = {
  title: string;
  role: InterviewTemplateRole;
  sessionTitle?: string;
  problemTitle?: string;
  interviewerNotes?: string[];
  candidateSignals?: string[];
};

type CalibrationRecord = {
  sessionId: string;
  sessionTitle: string;
  interviewerId: string;
  interviewerName: string;
  candidateId: string;
  candidateName: string;
  role: string;
  level: string;
  difficulty: number;
  scores: Record<string, number>;
  overallRating?: number | null;
  createdAt: string;
};

type CandidateRoundRecord = {
  candidateId: string;
  candidateName: string;
  sessionId: string;
  sessionTitle: string;
  role: string;
  level: string;
  difficulty: number;
  score: number;
  criteriaScores: Record<string, number>;
  interviewerId: string;
  interviewerName: string;
  createdAt: string;
};

type DebugSessionState = DebugSession;

type BillingLedgerEntry = {
  units: number;
  reason: string;
  createdAt: string;
};

type BillingAccountState = {
  organizationId: string;
  planId: string;
  seatCount: number;
  usageUnits: number;
  updatedAt: string;
};

const builtInPlans: BillingPlan[] = [
  {
    id: 'starter-hybrid',
    name: 'Starter Hybrid',
    type: 'HYBRID',
    currency: 'USD',
    monthlySeatPrice: 39,
    usageUnitPrice: 0.65,
    includedUsageUnits: 200,
  },
  {
    id: 'growth-seat',
    name: 'Growth Seat Plan',
    type: 'SEAT',
    currency: 'USD',
    monthlySeatPrice: 69,
    usageUnitPrice: 0,
    includedUsageUnits: 0,
  },
  {
    id: 'usage-first',
    name: 'Usage First',
    type: 'USAGE',
    currency: 'USD',
    monthlySeatPrice: 0,
    usageUnitPrice: 1.2,
    includedUsageUnits: 100,
  },
];

const interviewTemplates: InterviewTemplate[] = [
  {
    id: 'tpl-frontend-core',
    title: 'Frontend Core Loop',
    role: 'FRONTEND',
    problemIds: ['33333333-3333-3333-3333-333333333333'],
    durationMinutes: 45,
    tags: ['react', 'ui', 'state-management'],
    rubricNotes: [
      'Look for component decomposition and state modeling.',
      'Check how the candidate handles edge cases in the UI flow.',
    ],
    isPrivate: false,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-backend-api',
    title: 'Backend API Design',
    role: 'BACKEND',
    problemIds: ['44444444-4444-4444-4444-444444444444'],
    durationMinutes: 50,
    tags: ['api', 'data-modeling', 'scalability'],
    rubricNotes: [
      'Check how they define contracts and error handling.',
      'Listen for tradeoffs around persistence and consistency.',
    ],
    isPrivate: false,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-data-sql',
    title: 'Data Pipeline and SQL',
    role: 'DATA',
    problemIds: [],
    durationMinutes: 45,
    tags: ['sql', 'pipelines', 'analytics'],
    rubricNotes: [
      'Probe data quality assumptions and transformations.',
      'Check if they can explain batching and partitioning.',
    ],
    isPrivate: false,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-sde1-coding',
    title: 'SDE1 Coding Screen',
    role: 'SDE1',
    problemIds: ['33333333-3333-3333-3333-333333333333'],
    durationMinutes: 40,
    tags: ['arrays', 'strings', 'fundamentals'],
    rubricNotes: [
      'Focus on correctness and communication under time pressure.',
      'Look for a clean brute-force solution before optimization.',
    ],
    isPrivate: false,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-sde2-system-design',
    title: 'SDE2 System Design Lite',
    role: 'SDE2',
    problemIds: ['44444444-4444-4444-4444-444444444444'],
    durationMinutes: 55,
    tags: ['design', 'scaling', 'tradeoffs'],
    rubricNotes: [
      'Expect explicit tradeoffs and operational thinking.',
      'Evaluate how they defend interface boundaries.',
    ],
    isPrivate: false,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const integrationsByOrganization = new Map<string, IntegrationConnection[]>();
const calibrationLedger: CalibrationRecord[] = [];
const candidateRounds: CandidateRoundRecord[] = [];
const billingAccounts = new Map<string, BillingAccountState>();
const billingLedgerByOrganization = new Map<string, BillingLedgerEntry[]>();
const debugSessions = new Map<string, DebugSessionState>();

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function mean(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function variance(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const avg = mean(values);
  return mean(values.map((value) => (value - avg) ** 2));
}


export class InterviewProductService {
  constructor(
    private readonly scorecardService: ScorecardService,
    private readonly recordingService: RecordingService,
    private readonly antiCheatService: AntiCheatService,
  ) {}

  listTemplates(role?: InterviewTemplateRole) {
    return role ? interviewTemplates.filter((template) => template.role === role) : [...interviewTemplates];
  }

  getTemplate(templateId: string) {
    return interviewTemplates.find((template) => template.id === templateId) ?? null;
  }

  createTemplate(input: TemplateInput) {
    const now = new Date().toISOString();
    const template: InterviewTemplate = {
      id: makeId('template'),
      title: input.title,
      role: input.role,
      problemIds: input.problemIds ?? [],
      durationMinutes: input.durationMinutes ?? 45,
      tags: input.tags ?? [],
      rubricNotes: input.rubricNotes ?? [],
      isPrivate: input.isPrivate ?? true,
      createdBy: input.createdBy,
      level: input.level ?? null,
      createdAt: now,
      updatedAt: now,
    };

    interviewTemplates.push(template);
    return template;
  }

  applyTemplate(templateId: string, sessionId: string) {
    const template = this.getTemplate(templateId);

    if (!template) {
      throw new Error('TEMPLATE_NOT_FOUND');
    }

    return {
      sessionId,
      template,
      appliedProblemIds: [...template.problemIds],
      estimatedDurationMinutes: template.durationMinutes,
      rubricNotes: [...template.rubricNotes],
      appliedAt: new Date().toISOString(),
    };
  }

  draftRubric(input: RubricDraftInput): RubricDraft {
    const notes = [
      `Role focus: ${input.role}`,
      ...(input.interviewerNotes ?? []),
      ...(input.candidateSignals ?? []).map((signal) => `Observed candidate signal: ${signal}`),
    ];

    const summary = input.sessionTitle
      ? `Draft rubric for ${input.sessionTitle}`
      : `Draft rubric for ${input.title}`;

    const criteria = [
      {
        name: 'Problem Solving',
        guidance: 'Assess decomposition, tradeoffs, and correctness.',
        scoreAnchor: input.role === 'DATA' ? 'Can reason about data shaping and constraints.' : 'Can move from brute force to a robust solution.',
      },
      {
        name: 'Communication',
        guidance: 'Watch for clarity, structure, and how they ask questions.',
        scoreAnchor: 'Explains decisions clearly while keeping the interviewer aligned.',
      },
      {
        name: 'Execution Confidence',
        guidance: 'Check implementation discipline and debugging habits.',
        scoreAnchor: 'Moves steadily, validates assumptions, and recovers from mistakes.',
      },
    ];

    return {
      title: input.title,
      role: input.role,
      summary,
      notes,
      criteria,
      generatedAt: new Date().toISOString(),
    };
  }

  recordScorecard(entry: {
    sessionId: string;
    sessionTitle: string;
    interviewerId: string;
    interviewerName: string;
    candidateId: string;
    candidateName: string;
    role: string;
    level: string;
    difficulty: number;
    scores: Record<string, number>;
    overallRating?: number | null;
  }) {
    const createdAt = new Date().toISOString();
    calibrationLedger.push({
      ...entry,
      createdAt,
    });

    const scoreValues = Object.values(entry.scores);
    candidateRounds.push({
      candidateId: entry.candidateId,
      candidateName: entry.candidateName,
      sessionId: entry.sessionId,
      sessionTitle: entry.sessionTitle,
      role: entry.role,
      level: entry.level,
      difficulty: entry.difficulty,
      score: Number((scoreValues.reduce((total, value) => total + value, 0) / scoreValues.length).toFixed(2)),
      criteriaScores: entry.scores,
      interviewerId: entry.interviewerId,
      interviewerName: entry.interviewerName,
      createdAt,
    });
  }

  getCalibrationDashboard(rangeDays = 30): CalibrationDashboard {
    const since = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
    const recent = calibrationLedger.filter((record) => new Date(record.createdAt).getTime() >= since);
    const byInterviewer = new Map<string, CalibrationRecord[]>();

    for (const record of recent) {
      const entries = byInterviewer.get(record.interviewerId) ?? [];
      entries.push(record);
      byInterviewer.set(record.interviewerId, entries);
    }

    const interviewers = Array.from(byInterviewer.entries()).map(([interviewerId, records]) => {
      const scoreValues = records.map((record) => {
        const values = Object.values(record.scores);
        return mean(values);
      });

      const averageScore = mean(scoreValues);
      const varianceScore = variance(scoreValues);
      const overallRatings = records.map((record) => record.overallRating ?? averageScore);
      const rubricDrift = variance(overallRatings);

      return {
        interviewerId,
        interviewerName: records[0]?.interviewerName ?? interviewerId,
        scoreCount: records.length,
        averageScore: Number(averageScore.toFixed(2)),
        variance: Number(varianceScore.toFixed(2)),
        rubricDrift: Number(rubricDrift.toFixed(2)),
      };
    });

    const allAverages = interviewers.map((interviewer) => interviewer.averageScore);
    const allVariances = interviewers.map((interviewer) => interviewer.variance);

    return {
      rangeDays,
      overallAverageScore: Number(mean(allAverages).toFixed(2)),
      averageVariance: Number(mean(allVariances).toFixed(2)),
      interviewers,
      notes: [
        'Use the dashboard to spot lenient or strict interviewers.',
        'Rubric drift near zero suggests consistent scoring.',
      ],
    };
  }

  listIntegrations(organizationId: string) {
    return [...(integrationsByOrganization.get(organizationId) ?? [])];
  }

  connectIntegration(
    organizationId: string,
    provider: IntegrationProvider,
    externalId: string,
    notes?: string,
  ) {
    const integration: IntegrationConnection = {
      organizationId,
      provider,
      externalId,
      status: 'CONNECTED',
      lastSyncedAt: new Date().toISOString(),
      candidateMappings: {},
      notes,
    };

    const current = integrationsByOrganization.get(organizationId) ?? [];
    const next = current.filter((item) => item.provider !== provider);
    next.push(integration);
    integrationsByOrganization.set(organizationId, next);
    return integration;
  }

  syncCandidate(
    organizationId: string,
    provider: IntegrationProvider,
    candidateId: string,
    externalCandidateId: string,
    status: 'APPLIED' | 'INTERVIEWING' | 'OFFER' | 'REJECTED' | 'HIRED',
  ) {
    const integrations = integrationsByOrganization.get(organizationId) ?? [];
    const integration = integrations.find((item) => item.provider === provider);

    if (!integration) {
      throw new Error('INTEGRATION_NOT_FOUND');
    }

    integration.status = 'SYNCING';
    integration.candidateMappings[candidateId] = externalCandidateId;
    integration.lastSyncedAt = new Date().toISOString();
    integration.status = 'CONNECTED';

    return {
      organizationId,
      provider,
      candidateId,
      externalCandidateId,
      status,
      syncedAt: integration.lastSyncedAt,
    };
  }

  listBillingPlans() {
    return [...builtInPlans];
  }

  setBillingPlan(organizationId: string, planId: string, seatCount: number) {
    const plan = builtInPlans.find((item) => item.id === planId);

    if (!plan) {
      throw new Error('BILLING_PLAN_NOT_FOUND');
    }

    const account: BillingAccountState = {
      organizationId,
      planId,
      seatCount,
      usageUnits: billingAccounts.get(organizationId)?.usageUnits ?? 0,
      updatedAt: new Date().toISOString(),
    };

    billingAccounts.set(organizationId, account);
    return this.getBillingSummary(organizationId);
  }

  recordUsage(organizationId: string, units: number, reason: string) {
    const entries = billingLedgerByOrganization.get(organizationId) ?? [];
    entries.push({
      units,
      reason,
      createdAt: new Date().toISOString(),
    });
    billingLedgerByOrganization.set(organizationId, entries);

    const account = billingAccounts.get(organizationId) ?? {
      organizationId,
      planId: builtInPlans[0].id,
      seatCount: 0,
      usageUnits: 0,
      updatedAt: new Date().toISOString(),
    };

    account.usageUnits += units;
    account.updatedAt = new Date().toISOString();
    billingAccounts.set(organizationId, account);

    return this.getBillingSummary(organizationId);
  }

  getBillingSummary(organizationId: string): BillingSummary {
    const account = billingAccounts.get(organizationId) ?? {
      organizationId,
      planId: builtInPlans[0].id,
      seatCount: 0,
      usageUnits: 0,
      updatedAt: new Date().toISOString(),
    };

    const plan = builtInPlans.find((item) => item.id === account.planId) ?? builtInPlans[0];
    const billableUsage = Math.max(0, account.usageUnits - plan.includedUsageUnits);
    const seatChargeMonthly = plan.monthlySeatPrice * account.seatCount;
    const usageChargeMonthly = billableUsage * plan.usageUnitPrice;

    return {
      organizationId,
      plan,
      seatCount: account.seatCount,
      usageUnits: account.usageUnits,
      seatChargeMonthly: Number(seatChargeMonthly.toFixed(2)),
      usageChargeMonthly: Number(usageChargeMonthly.toFixed(2)),
      estimatedMonthlyTotal: Number((seatChargeMonthly + usageChargeMonthly).toFixed(2)),
      updatedAt: account.updatedAt,
    };
  }

  getUsageLedger(organizationId: string) {
    return [...(billingLedgerByOrganization.get(organizationId) ?? [])];
  }

  startDebugSession(sessionId: string, participants: string[]) {
    const now = new Date().toISOString();
    const current = debugSessions.get(sessionId);
    const session: DebugSessionState = current ?? {
      sessionId,
      status: 'ACTIVE',
      participants: [],
      executions: [],
      annotations: [],
      startedAt: now,
      updatedAt: now,
    };

    session.status = 'ACTIVE';
    session.participants = Array.from(new Set([...(session.participants ?? []), ...participants]));
    session.updatedAt = now;
    debugSessions.set(sessionId, session);
    return session;
  }

  executeDebugCode(input: {
    sessionId: string;
    executedById: string;
    executedByName: string;
    code: string;
    language: string;
    annotations?: string[];
  }) {
    const session = this.startDebugSession(input.sessionId, [input.executedById]);
    const normalized = input.code.toLowerCase();
    const verdict = /throw\s+new|panic\(|fatal\(/.test(normalized) ? 'RUNTIME_ERROR' : 'ACCEPTED';
    const execution: DebugExecution = {
      id: makeId('debug-execution'),
      sessionId: input.sessionId,
      executedById: input.executedById,
      executedByName: input.executedByName,
      code: input.code,
      language: input.language,
      result: {
        verdict,
        stdout: verdict === 'ACCEPTED' ? 'Execution completed successfully.' : '',
        stderr: verdict === 'ACCEPTED' ? '' : 'Runtime failure detected in collaborative debug mode.',
      },
      annotations: input.annotations ?? [],
      createdAt: new Date().toISOString(),
    };

    session.executions.push(execution);
    session.updatedAt = execution.createdAt;
    debugSessions.set(input.sessionId, session);

    return execution;
  }

  annotateDebugSession(input: {
    sessionId: string;
    authorId: string;
    authorName: string;
    message: string;
    anchor?: { filePath?: string; line?: number; column?: number } | null;
  }) {
    const session = this.startDebugSession(input.sessionId, [input.authorId]);
    const annotation: DebugAnnotation = {
      id: makeId('debug-annotation'),
      sessionId: input.sessionId,
      authorId: input.authorId,
      authorName: input.authorName,
      message: input.message,
      anchor: input.anchor ?? null,
      createdAt: new Date().toISOString(),
    };

    session.annotations.push(annotation);
    session.updatedAt = annotation.createdAt;
    debugSessions.set(input.sessionId, session);
    return annotation;
  }

  getDebugSession(sessionId: string) {
    return debugSessions.get(sessionId) ?? null;
  }

  getCandidateSkillGraph(candidateId: string, candidateName?: string): CandidateSkillGraph {
    const rounds = candidateRounds
      .filter((round) => round.candidateId === candidateId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const criteriaTotals: Record<string, number> = {};
    const criteriaCounts: Record<string, number> = {};

    for (const round of rounds) {
      for (const [criteria, score] of Object.entries(round.criteriaScores)) {
        criteriaTotals[criteria] = (criteriaTotals[criteria] ?? 0) + score;
        criteriaCounts[criteria] = (criteriaCounts[criteria] ?? 0) + 1;
      }
    }

    const criteriaAverages = Object.fromEntries(
      Object.entries(criteriaTotals).map(([criteria, total]) => [
        criteria,
        Number((total / (criteriaCounts[criteria] ?? 1)).toFixed(2)),
      ]),
    );

    const trajectory: SkillNode[] = rounds.map((round, index) => ({
      round: index + 1,
      sessionId: round.sessionId,
      role: round.role,
      level: round.level,
      score: round.score,
      difficulty: round.difficulty,
      createdAt: round.createdAt,
    }));

    const improvementTrend = trajectory.length > 1
      ? Number((trajectory[trajectory.length - 1].score - trajectory[0].score).toFixed(2))
      : trajectory[0]?.score ?? 0;

    return {
      candidateId,
      candidateName,
      criteriaAverages,
      overallTrajectory: trajectory,
      improvementTrend,
    };
  }

  getBenchmarkSummary(role: string, level: string, candidateId?: string): BenchmarkSummary {
    const rounds = candidateRounds.filter((round) => round.role === role && round.level === level);
    const scores = rounds.map((round) => round.score);
    const candidateRoundsForId = candidateId
      ? rounds.filter((round) => round.candidateId === candidateId)
      : [];
    const candidateScore = candidateRoundsForId.length > 0
      ? candidateRoundsForId[candidateRoundsForId.length - 1].score
      : undefined;
    const sortedScores = [...scores].sort((a, b) => a - b);
    const percentile =
      candidateScore === undefined || scores.length === 0
        ? undefined
        : Number((100 * (sortedScores.filter((score) => score <= candidateScore).length / sortedScores.length)).toFixed(2));

    return {
      role,
      level,
      sampleSize: rounds.length,
      averageScore: Number(mean(scores).toFixed(2)),
      candidatePercentile: percentile,
      difficultyAverage: Number(mean(rounds.map((round) => round.difficulty)).toFixed(2)),
      notes: rounds.length === 0
        ? ['Not enough data yet for this role/level bucket.']
        : ['Use percentile and difficulty averages to compare against historical performance.'],
    };
  }

  async buildEvidenceTrail(sessionId: string, candidateId: string): Promise<EvidenceTrail> {
    const candidateRecords = candidateRounds.filter(
      (round) => round.sessionId === sessionId && round.candidateId === candidateId,
    );
    const latest = candidateRecords[candidateRecords.length - 1];
    const recording = await this.recordingService.getRecording(sessionId);
    const antiCheatEvents = await this.antiCheatService.getSessionEvents(sessionId);
    const averageScore = latest
      ? mean(Object.values(latest.criteriaScores))
      : 0;
    const totalSeverity = antiCheatEvents.reduce((sum, event) => sum + event.severity, 0);
    const items: EvidenceTrailItem[] = [];

    if (latest) {
      items.push({
        id: makeId('evidence'),
        category: averageScore >= 4 ? 'POSITIVE' : averageScore <= 3 ? 'NEGATIVE' : 'NEUTRAL',
        label: 'Scorecard outcome',
        evidence: `Average round score was ${averageScore.toFixed(2)} for ${latest.sessionTitle}.`,
        source: 'scorecard',
        weight: averageScore >= 4 ? 3 : averageScore <= 3 ? -3 : 1,
      });
    }

    if (recording?.codeSnapshots?.length) {
      items.push({
        id: makeId('evidence'),
        category: 'POSITIVE',
        label: 'Code progression',
        evidence: `Captured ${recording.codeSnapshots.length} code snapshots during the session.`,
        source: 'recording',
        weight: 2,
      });
    }

    if (antiCheatEvents.length > 0) {
      items.push({
        id: makeId('evidence'),
        category: totalSeverity >= 8 ? 'NEGATIVE' : 'NEUTRAL',
        label: 'Anti-cheat context',
        evidence: `${antiCheatEvents.length} anti-cheat events recorded with total severity ${totalSeverity}.`,
        source: 'anti-cheat',
        weight: totalSeverity >= 8 ? -3 : -1,
      });
    }

    const debugSession = debugSessions.get(sessionId);
    if (debugSession?.executions.length) {
      items.push({
        id: makeId('evidence'),
        category: 'POSITIVE',
        label: 'Collaborative debugging activity',
        evidence: `${debugSession.executions.length} collaborative executions and ${debugSession.annotations.length} annotations were recorded.`,
        source: 'debug-session',
        weight: 2,
      });
    }

    const trailScore = items.reduce((sum, item) => sum + item.weight, 0);
    const recommendation: EvidenceTrail['recommendation'] =
      trailScore >= 4 && totalSeverity < 8 && averageScore >= 3.8
        ? 'HIRE'
        : trailScore <= -2 || averageScore < 3
          ? 'NO_HIRE'
          : 'REVIEW';

    return {
      sessionId,
      candidateId,
      recommendation,
      summary:
        recommendation === 'HIRE'
          ? 'Evidence strongly supports moving forward.'
          : recommendation === 'NO_HIRE'
            ? 'Evidence suggests the candidate should not advance.'
            : 'Evidence is mixed; review with the panel before deciding.',
      items,
      generatedAt: new Date().toISOString(),
    };
  }

  getQualityAnalytics(rangeDays = 30): QualityAnalytics {
    const since = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
    const recentRounds = candidateRounds.filter((round) => new Date(round.createdAt).getTime() >= since);
    const earlyBucket = recentRounds.slice(0, Math.max(1, Math.floor(recentRounds.length / 2)));
    const lateBucket = recentRounds.slice(Math.max(1, Math.floor(recentRounds.length / 2)));
    const questionDifficultyDrift = Number((mean(lateBucket.map((round) => round.difficulty)) - mean(earlyBucket.map((round) => round.difficulty))).toFixed(2));

    const falseNegativeSignals = recentRounds
      .filter((round) => round.score >= 4 && (round.overallRating ?? round.score) < 3)
      .map((round) => `${round.candidateName} in ${round.sessionTitle} scored well but was rated low by the interviewer.`);

    const biasSignals: InterviewerBiasSignal[] = [];
    const byInterviewer = new Map<string, CalibrationRecord[]>();
    for (const record of calibrationLedger.filter((item) => new Date(item.createdAt).getTime() >= since)) {
      const current = byInterviewer.get(record.interviewerId) ?? [];
      current.push(record);
      byInterviewer.set(record.interviewerId, current);
    }

    const allScores = recentRounds.map((round) => round.score);
    const globalAverage = mean(allScores);

    for (const [interviewerId, records] of byInterviewer.entries()) {
      const interviewerAverage = mean(records.map((record) => mean(Object.values(record.scores))));
      const interviewerVariance = variance(records.map((record) => mean(Object.values(record.scores))));
      const interviewerName = records[0]?.interviewerName ?? interviewerId;
      if (interviewerAverage - globalAverage >= 0.5) {
        biasSignals.push({
          interviewerId,
          interviewerName,
          biasType: 'LENIENT',
          signalScore: Number((interviewerAverage - globalAverage).toFixed(2)),
          evidence: `Average score ${interviewerAverage.toFixed(2)} is above cohort average ${globalAverage.toFixed(2)}.`,
        });
      } else if (globalAverage - interviewerAverage >= 0.5) {
        biasSignals.push({
          interviewerId,
          interviewerName,
          biasType: 'STRICT',
          signalScore: Number((globalAverage - interviewerAverage).toFixed(2)),
          evidence: `Average score ${interviewerAverage.toFixed(2)} is below cohort average ${globalAverage.toFixed(2)}.`,
        });
      }

      if (interviewerVariance >= 1.5) {
        biasSignals.push({
          interviewerId,
          interviewerName,
          biasType: 'HIGH_VARIANCE',
          signalScore: Number(interviewerVariance.toFixed(2)),
          evidence: `High score variance of ${interviewerVariance.toFixed(2)} indicates inconsistent calibration.`,
        });
      }
    }

    return {
      rangeDays,
      questionDifficultyDrift,
      falseNegativeSignals,
      interviewerBiasSignals: biasSignals,
      notes: [
        'Question difficulty drift compares the first and second halves of the sample window.',
        'False negatives are heuristics; review them before changing hiring decisions.',
      ],
    };
  }
}
