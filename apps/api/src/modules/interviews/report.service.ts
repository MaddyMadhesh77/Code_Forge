
import { randomBytes } from 'node:crypto';

import { NotFoundError, UnauthorizedError } from '../../common/errors/app-error.js';
import { PrismaService } from '../../database/prisma.service.js';


const SHARE_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class ReportService {
  constructor(private prisma: PrismaService) {}

  async createReport(sessionId: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('Session', 'SESSION_NOT_FOUND');
    }

    // Upsert: regenerating a report replaces the previous one rather than
    // failing on the one-report-per-session constraint.
    return this.prisma.interviewReport.upsert({
      where: { sessionId },
      create: {
        sessionId,
        summary: `Interview report for ${session.title}`,
        shareToken: this.generateShareToken(),
        shareExpiry: new Date(Date.now() + SHARE_LINK_TTL_MS),
      },
      update: {
        summary: `Interview report for ${session.title}`,
        generatedAt: new Date(),
      },
    });
  }

  async getReportBySessionId(sessionId: string) {
    return await this.prisma.interviewReport.findFirst({
      where: { sessionId },
    });
  }

  async getReportByShareToken(token: string) {
    const report = await this.prisma.interviewReport.findUnique({
      where: { shareToken: token },
    });

    if (!report) {
      throw new NotFoundError('Report', 'REPORT_NOT_FOUND');
    }

    if (!report.shareExpiry || report.shareExpiry < new Date()) {
      throw new UnauthorizedError('Share link has expired', 'SHARE_LINK_EXPIRED');
    }

    return report;
  }

  async generateExportData(
    sessionId: string,
    format: 'PDF' | 'JSON',
    includeRecording: boolean = false,
  ) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
        problems: {
          include: {
            problem: true,
          },
        },
        submissions: true,
      },
    });

    if (!session) {
      throw new NotFoundError('Session', 'SESSION_NOT_FOUND');
    }

    const scorecards = await this.prisma.scorecard.findMany({
      where: { sessionId },
    });

    const recording = includeRecording
      ? await this.prisma.interviewRecording.findUnique({
          where: { sessionId },
          include: { _count: { select: { events: true, snapshots: true } } },
        })
      : null;

    const antiCheatReport = await this.prisma.antiCheatEvent.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });

    const exportData = {
      sessionId,
      sessionTitle: session.title,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      duration: this.calculateDuration(session.startedAt, session.endedAt),
      participants: session.participants.map((p: any) => ({
        userId: p.userId,
        name: p.user.displayName,
        email: p.user.email,
        role: p.role,
        joinedAt: p.joinedAt,
      })),
      problems: session.problems.map((p: any) => ({
        id: p.problem.id,
        title: p.problem.title,
        difficulty: p.problem.difficulty,
      })),
      submissionCount: session.submissions.length,
      scorecards: scorecards.map((scorecard) => ({
        interviewerId: scorecard.authorId,
        scores: scorecard.scores,
        feedback: scorecard.feedback,
        overallRating: scorecard.overall,
      })),
      antiCheatSummary: {
        totalEvents: antiCheatReport.length,
        eventsByType: this.groupEventsByType(antiCheatReport),
        highRiskParticipants: this.identifyHighRiskParticipants(antiCheatReport),
      },
      ...(recording && {
        recordingDuration: this.calculateRecordingDuration(recording),
        codeSnapshotCount: recording._count.snapshots,
        eventCount: recording._count.events,
      }),
    };

    return format === 'JSON' ? exportData : this.formatForPDF(exportData);
  }

  private calculateDuration(startTime?: Date | null, endTime?: Date | null): number {
    if (!startTime || !endTime) return 0;
    return Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60); // in minutes
  }

  private calculateRecordingDuration(recording: any): number {
    const startTime = recording.startedAt;
    const endTime = recording.stoppedAt || new Date();
    return Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60); // in minutes
  }

  private groupEventsByType(events: any[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {});
  }

  private identifyHighRiskParticipants(events: any[]): any[] {
    const participantScores = new Map<string, { count: number; severity: number }>();

    for (const event of events) {
      const existing = participantScores.get(event.participantId) || {
        count: 0,
        severity: 0,
      };
      participantScores.set(event.participantId, {
        count: existing.count + 1,
        severity: existing.severity + event.severity,
      });
    }

    return Array.from(participantScores.entries())
      .filter(([_, data]) => data.severity >= 8)
      .map(([participantId, data]) => ({
        participantId,
        eventCount: data.count,
        totalSeverity: data.severity,
        riskLevel: data.severity >= 15 ? 'HIGH' : 'MEDIUM',
      }));
  }

  private formatForPDF(data: any): string {
    // This would be converted to PDF on the client side or using a library like puppeteer
    // For now, return a formatted HTML string
    return `
      <html>
        <head>
          <title>Interview Report - ${data.sessionTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            .section { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>${data.sessionTitle}</h1>
          <div class="section">
            <h2>Session Details</h2>
            <p>Status: ${data.status}</p>
            <p>Duration: ${data.duration} minutes</p>
            <p>Participant Count: ${data.participants.length}</p>
          </div>
          <div class="section">
            <h2>Scorecards</h2>
            ${data.scorecards.length > 0 ? `
              <p>Total Evaluations: ${data.scorecards.length}</p>
              <p>Average Rating: ${this.calculateAverageRating(data.scorecards)}</p>
            ` : '<p>No scorecards submitted</p>'}
          </div>
          <div class="section">
            <h2>Anti-Cheat Summary</h2>
            <p>Total Events: ${data.antiCheatSummary.totalEvents}</p>
            <p>High Risk Participants: ${data.antiCheatSummary.highRiskParticipants.length}</p>
          </div>
        </body>
      </html>
    `;
  }

  private calculateAverageRating(scorecards: any[]): number {
    const ratings = scorecards
      .filter((s) => s.overallRating)
      .map((s) => s.overallRating);
    return ratings.length > 0 ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)) : 0;
  }

  async extendShareLink(sessionId: string, expiryDays: number = 30) {
    const report = await this.getReportBySessionId(sessionId);

    if (!report) {
      throw new Error('Report not found');
    }

    return await this.prisma.interviewReport.update({
      where: { id: report.id },
      data: {
        shareExpiry: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
      },
    });
  }

  async revokeShareLink(sessionId: string) {
    const report = await this.getReportBySessionId(sessionId);

    if (!report) {
      throw new Error('Report not found');
    }

    return await this.prisma.interviewReport.update({
      where: { id: report.id },
      data: { shareToken: null },
    });
  }

  /** 32 bytes of CSPRNG output — the token is the only credential for the
   * public report view, so it must not be guessable. */
  private generateShareToken(): string {
    return randomBytes(32).toString('base64url');
  }
}

