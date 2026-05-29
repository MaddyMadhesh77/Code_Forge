import { InterviewsService } from "./interviews.service.js";
import { RecordingService } from "./recording.service.js";
import { ScorecardService } from "./scorecard.service.js";
import { AntiCheatService } from "./anti-cheat.service.js";
import { ReportService } from "./report.service.js";
import { PdfExportService } from "./pdf-export.service.js";
import { EmailNotificationService } from "./email-notification.service.js";
import { ComplexityAnalysisService } from "./complexity-analysis.service.js";
import { AiReviewService } from "./ai-review.service.js";
import { AnalyticsService } from "./analytics.service.js";
import { InterviewProductService } from "./interview-product.service.js";
import {
  CreateInterviewDto,
  CreateSessionLinkDto,
  JoinInterviewDto,
  CreateScorecardDto,
  AnalyzeComplexityDto,
  ReviewCodeDto,
  SendInviteEmailDto,
  SendReportEmailDto,
  UploadRecordingArtifactDto,
} from "./dto/index.js";

export class InterviewsController {
  constructor(
    private interviewsService: InterviewsService,
    private recordingService: RecordingService,
    private scorecardService: ScorecardService,
    private antiCheatService: AntiCheatService,
    private reportService: ReportService,
    private pdfExportService: PdfExportService,
    private emailNotificationService: EmailNotificationService,
    private complexityAnalysisService: ComplexityAnalysisService,
    private aiReviewService: AiReviewService,
    private analyticsService: AnalyticsService,
    private interviewProductService: InterviewProductService,
  ) {}

  async createInterview(user: any, data: CreateInterviewDto) {
    const template = data.templateId
      ? this.interviewProductService.getTemplate(data.templateId)
      : null;

    const resolvedProblemId = data.problemId ?? template?.problemIds[0];
    const resolvedRole = data.role ?? template?.role;
    const resolvedLevel = data.level ?? (template as any)?.level ?? 'MID';

    if (!resolvedProblemId) {
      throw new Error('Either problemId or templateId must be provided');
    }

    return await this.interviewsService.createInterview(user.id, {
      ...data,
      problemId: resolvedProblemId,
      role: resolvedRole,
      level: resolvedLevel,
    });
  }

  
  async listInterviews(
     user: any,
     limit?: number,
     offset?: number,
  ) {
    return await this.interviewsService.listInterviews(
      user.id,
      limit || 10,
      offset || 0,
    );
  }

  
  async getInterview( sessionId: string) {
    const session = await this.interviewsService.getInterview(sessionId);
    if (!session) {
      throw new Error('Interview not found');
    }
    return session;
  }

  
  async createSessionLink(
     sessionId: string,
     user: any,
     data: CreateSessionLinkDto,
  ) {
    return await this.interviewsService.createSessionLink(sessionId, user.id, data);
  }

  
  async getSessionLinks(
     sessionId: string,
     user: any,
  ) {
    return await this.interviewsService.getSessionLinks(sessionId, user.id);
  }

  
  async revokeSessionLink(
     linkId: string,
     user: any,
  ) {
    return await this.interviewsService.revokeSessionLink(linkId, user.id);
  }

  
  async joinSession(
     user: any,
     data: JoinInterviewDto,
  ) {
    return await this.interviewsService.joinSession(data, user.id);
  }

  
  async updateStatus(
     sessionId: string,
     body: { status: string },
  ) {
    return await this.interviewsService.updateInterviewStatus(sessionId, body.status);
  }

  
  async endSession( sessionId: string) {
    return await this.interviewsService.endSession(sessionId);
  }

  
  async getRecording( sessionId: string) {
    return await this.recordingService.getRecording(sessionId);
  }

  
  async uploadRecordingArtifact(
     sessionId: string,
     data: UploadRecordingArtifactDto,
  ) {
    return this.recordingService.saveRecordingArtifact(sessionId, {
      fileName: data.fileName,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      durationMs: data.durationMs,
      source: data.source,
      storageUrl: data.storageUrl,
    });
  }

  
  async listRecordingArtifacts( sessionId: string) {
    return this.recordingService.getRecordingArtifacts(sessionId);
  }

  
  async createScorecard(
     sessionId: string,
     user: any,
     data: CreateScorecardDto,
  ) {
    // Get candidate from session
    const session = await this.interviewsService.getInterview(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const candidates = session.participants.filter((p: any) => p.role === 'CANDIDATE');
    if (candidates.length === 0) {
      throw new Error('No candidate found in session');
    }

    return await this.scorecardService.createScorecard(
      sessionId,
      user.id,
      candidates[0].userId,
      data,
    ).then((scorecard) => {
      const interviewer = session.participants.find((participant: any) => participant.userId === user.id);
      const questionDifficulty = session.problems?.[0]?.problem?.difficulty ?? 'MEDIUM';
      this.interviewProductService.recordScorecard({
        sessionId,
        sessionTitle: session.title,
        interviewerId: user.id,
        interviewerName: interviewer?.user?.displayName ?? user.displayName ?? user.id,
        candidateId: candidates[0].userId,
        candidateName: candidates[0].user?.displayName ?? candidates[0].userId,
        role: (session as any).role ?? session.participants[0]?.role ?? 'INTERVIEWER',
        level: (session as any).level ?? 'MID',
        difficulty: questionDifficulty === 'HARD' ? 3 : questionDifficulty === 'MEDIUM' ? 2 : 1,
        scores: scorecard.scores as Record<string, number>,
        overallRating: scorecard.overallRating ?? null,
      });

      return scorecard;
    });
  }

  
  async getScorecard(
     sessionId: string,
     user: any,
  ) {
    return await this.scorecardService.getScorecard(sessionId, user.id);
  }

  
  async getAllScorecards( sessionId: string) {
    return await this.scorecardService.getAllScorecards(sessionId);
  }

  
  async getScorecardReport( sessionId: string) {
    return await this.scorecardService.generateScorecardReport(sessionId);
  }

  
  async getAntiCheatReport( sessionId: string) {
    return await this.antiCheatService.generateAntiCheatReport(sessionId);
  }

  
  async getAntiCheatEvents( sessionId: string) {
    return await this.antiCheatService.getSessionEvents(sessionId);
  }

  
  async exportInterview(
     sessionId: string,
     body: { format: 'PDF' | 'JSON'; includeRecording?: boolean },
  ) {
    const exportData = await this.reportService.generateExportData(
      sessionId,
      body.format,
      body.includeRecording,
    );

    if (body.format === 'PDF' && typeof exportData === 'string') {
      const pdfBuffer = await this.pdfExportService.renderHtmlToPdfBuffer(exportData);
      return {
        contentType: 'application/pdf',
        fileName: `interview-${sessionId}.pdf`,
        data: Buffer.from(pdfBuffer).toString('base64'),
      };
    }

    return exportData;
  }

  
  async analyzeComplexity(
     _sessionId: string,
     data: AnalyzeComplexityDto,
  ) {
    return this.complexityAnalysisService.analyze(data.code);
  }

  
  async reviewCode(
     _sessionId: string,
     data: ReviewCodeDto,
  ) {
    return this.aiReviewService.reviewCode(data.code, data.language);
  }

  
  async sendInviteEmail( data: SendInviteEmailDto) {
    return this.emailNotificationService.sendInterviewInvite(data);
  }

  
  async sendReportEmail( data: SendReportEmailDto) {
    return this.emailNotificationService.sendInterviewReportEmail(
      data.to,
      data.sessionTitle,
      data.reportUrl,
    );
  }

  
  async getDashboard( days?: number) {
    const range = Number(days);
    return this.analyticsService.getInterviewDashboard(Number.isFinite(range) && range > 0 ? range : 14);
  }

  
  async startDebugSession(
     sessionId: string,
     body: { participants: string[] },
  ) {
    return this.interviewProductService.startDebugSession(sessionId, body.participants ?? []);
  }

  
  async executeDebugCode(
     sessionId: string,
    
    body: {
      executedById: string;
      executedByName: string;
      code: string;
      language: string;
      annotations?: string[];
    },
  ) {
    return this.interviewProductService.executeDebugCode({
      sessionId,
      ...body,
    });
  }

  
  async annotateDebugSession(
     sessionId: string,
    
    body: {
      authorId: string;
      authorName: string;
      message: string;
      anchor?: { filePath?: string; line?: number; column?: number } | null;
    },
  ) {
    return this.interviewProductService.annotateDebugSession({
      sessionId,
      ...body,
    });
  }

  
  async getDebugSession( sessionId: string) {
    return this.interviewProductService.getDebugSession(sessionId);
  }

  
  async getEvidenceTrail(
     sessionId: string,
     candidateId: string,
  ) {
    return this.interviewProductService.buildEvidenceTrail(sessionId, candidateId);
  }

  
  async getCandidateSkillGraph(
     _sessionId: string,
     candidateId: string,
     candidateName?: string,
  ) {
    return this.interviewProductService.getCandidateSkillGraph(candidateId, candidateName);
  }

  
  async getBenchmarks(
     role: string,
     level: string,
     candidateId?: string,
  ) {
    return this.interviewProductService.getBenchmarkSummary(role, level, candidateId);
  }

  
  async getQualityAnalytics( days?: number) {
    const range = Number(days);
    return this.interviewProductService.getQualityAnalytics(Number.isFinite(range) && range > 0 ? range : 30);
  }

  
  async listTemplates( role?: string) {
    return this.interviewProductService.listTemplates(role as any);
  }

  
  async createTemplate(
     user: any,
    
    body: {
      title: string;
      role: 'FRONTEND' | 'BACKEND' | 'DATA' | 'SDE1' | 'SDE2';
      level?: string;
      problemIds?: string[];
      durationMinutes?: number;
      tags?: string[];
      rubricNotes?: string[];
      isPrivate?: boolean;
    },
  ) {
    return this.interviewProductService.createTemplate({
      ...body,
      createdBy: user.id,
    });
  }

  
  async getTemplate( templateId: string) {
    return this.interviewProductService.getTemplate(templateId);
  }

  
  async applyTemplate(
     templateId: string,
     body: { sessionId: string },
  ) {
    return this.interviewProductService.applyTemplate(templateId, body.sessionId);
  }

  
  async draftRubric(
    
    body: {
      title: string;
      role: 'FRONTEND' | 'BACKEND' | 'DATA' | 'SDE1' | 'SDE2';
      sessionTitle?: string;
      problemTitle?: string;
      interviewerNotes?: string[];
      candidateSignals?: string[];
    },
  ) {
    return this.interviewProductService.draftRubric(body);
  }

  
  async calibrationDashboard( days?: number) {
    const range = Number(days);
    return this.interviewProductService.getCalibrationDashboard(
      Number.isFinite(range) && range > 0 ? range : 30,
    );
  }

  
  async listIntegrations( organizationId: string) {
    return this.interviewProductService.listIntegrations(organizationId);
  }

  
  async connectIntegration(
     provider: 'GREENHOUSE' | 'LEVER' | 'WORKDAY',
     body: { organizationId: string; externalId: string; notes?: string },
  ) {
    return this.interviewProductService.connectIntegration(
      body.organizationId,
      provider,
      body.externalId,
      body.notes,
    );
  }

  
  async syncIntegration(
     provider: 'GREENHOUSE' | 'LEVER' | 'WORKDAY',
    
    body: {
      organizationId: string;
      candidateId: string;
      externalCandidateId: string;
      status: 'APPLIED' | 'INTERVIEWING' | 'OFFER' | 'REJECTED' | 'HIRED';
    },
  ) {
    return this.interviewProductService.syncCandidate(
      body.organizationId,
      provider,
      body.candidateId,
      body.externalCandidateId,
      body.status,
    );
  }

  
  async listBillingPlans() {
    return this.interviewProductService.listBillingPlans();
  }

  
  async billingSummary( organizationId: string) {
    return this.interviewProductService.getBillingSummary(organizationId);
  }

  
  async setBillingPlan(
     body: { organizationId: string; planId: string; seatCount: number },
  ) {
    return this.interviewProductService.setBillingPlan(
      body.organizationId,
      body.planId,
      body.seatCount,
    );
  }

  
  async recordUsage(
     body: { organizationId: string; units: number; reason: string },
  ) {
    return this.interviewProductService.recordUsage(body.organizationId, body.units, body.reason);
  }

  
  async createReport(
     sessionId: string,
     user: any,
  ) {
    // Create report with generated scorecard
    const scorecard = await this.scorecardService.getScorecard(sessionId, user.id);
    return await this.reportService.createReport(sessionId, scorecard?.id);
  }

  
  async getReport( sessionId: string) {
    return await this.reportService.getReportBySessionId(sessionId);
  }

  
  async extendShareLink(
     sessionId: string,
     body: { expiryDays?: number },
  ) {
    return await this.reportService.extendShareLink(sessionId, body.expiryDays);
  }

  
  async revokeShareLink( sessionId: string) {
    return await this.reportService.revokeShareLink(sessionId);
  }

  
  async getPublicReport( token: string) {
    const report = await this.reportService.getReportByShareToken(token);
    // Return limited information (no sensitive details)
    return {
      sessionId: report.sessionId,
      generatedAt: report.generatedAt,
      summary: report.summary,
    };
  }
}




