import type { InterviewTemplateRole } from "@codeforge/shared";

import { InterviewProductService } from "../interview-product.service.js";
import type { AuthenticatedUser } from "../../../common/guards/jwt-auth.guard.js";

const DEFAULT_RANGE_DAYS = 30;

type IntegrationProvider = "GREENHOUSE" | "LEVER" | "WORKDAY";

/**
 * The commercial surface around interviews: templates, collaborative
 * debugging, hiring-signal analytics, ATS integrations and billing.
 *
 * Note: `InterviewProductService` still keeps this data in module-level maps
 * and arrays, so it does not survive a restart and is not shared between
 * replicas. The interview core (sessions, submissions, scorecards, notes,
 * recordings) is now fully persisted; this surface is not, and should move to
 * tables before it is relied on.
 */
export class InterviewProductController {
  constructor(private readonly products: InterviewProductService) {}

  // --- Collaborative debugging -----------------------------------------

  startDebugSession(sessionId: string, participants: string[]) {
    return this.products.startDebugSession(sessionId, participants ?? []);
  }

  executeDebugCode(
    sessionId: string,
    body: {
      executedById: string;
      executedByName: string;
      code: string;
      language: string;
      annotations?: string[];
    },
  ) {
    return this.products.executeDebugCode({ sessionId, ...body });
  }

  annotateDebugSession(
    sessionId: string,
    body: {
      authorId: string;
      authorName: string;
      message: string;
      anchor?: { filePath?: string; line?: number; column?: number } | null;
    },
  ) {
    return this.products.annotateDebugSession({ sessionId, ...body });
  }

  getDebugSession(sessionId: string) {
    return this.products.getDebugSession(sessionId);
  }

  // --- Hiring signal ----------------------------------------------------

  getEvidenceTrail(sessionId: string, candidateId: string) {
    return this.products.buildEvidenceTrail(sessionId, candidateId);
  }

  getCandidateSkillGraph(candidateId: string, candidateName?: string) {
    return this.products.getCandidateSkillGraph(candidateId, candidateName);
  }

  getBenchmarks(role: string, level: string, candidateId?: string) {
    return this.products.getBenchmarkSummary(role, level, candidateId);
  }

  getQualityAnalytics(days?: number) {
    return this.products.getQualityAnalytics(rangeOrDefault(days));
  }

  getCalibrationDashboard(days?: number) {
    return this.products.getCalibrationDashboard(rangeOrDefault(days));
  }

  // --- Templates --------------------------------------------------------

  listTemplates(role?: string) {
    return this.products.listTemplates(role as InterviewTemplateRole | undefined);
  }

  createTemplate(
    user: AuthenticatedUser,
    body: {
      title: string;
      role: InterviewTemplateRole;
      level?: string;
      problemIds?: string[];
      durationMinutes?: number;
      tags?: string[];
      rubricNotes?: string[];
      isPrivate?: boolean;
    },
  ) {
    return this.products.createTemplate({ ...body, createdBy: user.id });
  }

  getTemplate(templateId: string) {
    return this.products.getTemplate(templateId);
  }

  applyTemplate(templateId: string, sessionId: string) {
    return this.products.applyTemplate(templateId, sessionId);
  }

  draftRubric(body: {
    title: string;
    role: InterviewTemplateRole;
    sessionTitle?: string;
    problemTitle?: string;
    interviewerNotes?: string[];
    candidateSignals?: string[];
  }) {
    return this.products.draftRubric(body);
  }

  // --- ATS integrations -------------------------------------------------

  listIntegrations(organizationId: string) {
    return this.products.listIntegrations(organizationId);
  }

  connectIntegration(
    provider: IntegrationProvider,
    body: { organizationId: string; externalId: string; notes?: string },
  ) {
    return this.products.connectIntegration(
      body.organizationId,
      provider,
      body.externalId,
      body.notes,
    );
  }

  syncIntegration(
    provider: IntegrationProvider,
    body: {
      organizationId: string;
      candidateId: string;
      externalCandidateId: string;
      status: "APPLIED" | "INTERVIEWING" | "OFFER" | "REJECTED" | "HIRED";
    },
  ) {
    return this.products.syncCandidate(
      body.organizationId,
      provider,
      body.candidateId,
      body.externalCandidateId,
      body.status,
    );
  }

  // --- Billing ----------------------------------------------------------

  listBillingPlans() {
    return this.products.listBillingPlans();
  }

  getBillingSummary(organizationId: string) {
    return this.products.getBillingSummary(organizationId);
  }

  setBillingPlan(body: { organizationId: string; planId: string; seatCount: number }) {
    return this.products.setBillingPlan(body.organizationId, body.planId, body.seatCount);
  }

  recordUsage(body: { organizationId: string; units: number; reason: string }) {
    return this.products.recordUsage(body.organizationId, body.units, body.reason);
  }
}

function rangeOrDefault(days?: number): number {
  const range = Number(days);
  return Number.isFinite(range) && range > 0 ? range : DEFAULT_RANGE_DAYS;
}
