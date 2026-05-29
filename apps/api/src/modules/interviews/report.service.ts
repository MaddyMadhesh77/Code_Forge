
import { PrismaService } from '../../database/prisma.service.js';
import * as crypto from 'crypto';


export class ReportService {
  constructor(private prisma: PrismaService) {}

  async createReport(
    sessionId: string,
    scorecardId?: string,
  ) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const shareToken = this.generateShareToken();

    const report = await this.prisma.interviewReport.create({
      data: {
        sessionId,
        scorecard_id: scorecardId,
        shareToken,
        shareExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return report;
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
      throw new Error('Report not found or access denied');
    }

    if (report.shareExpiry && report.shareExpiry < new Date()) {
      throw new Error('Share link has expired');
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
      throw new Error('Session not found');
    }

    const scorecards = await this.prisma.interviewScorecard.findMany({
      where: { sessionId },
    });

    const recording = includeRecording
      ? await this.prisma.interviewRecording.findUnique({
          where: { sessionId },
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
      scorecards: scorecards.map((s: any) => ({
        interviewerId: s.interviewerId,
        scores: s.scores,
        feedback: s.feedback,
        overallRating: s.overallRating,
      })),
      antiCheatSummary: {
        totalEvents: antiCheatReport.length,
        eventsByType: this.groupEventsByType(antiCheatReport),
        highRiskParticipants: this.identifyHighRiskParticipants(antiCheatReport),
      },
      ...(recording && {
        recordingDuration: this.calculateRecordingDuration(recording),
        codeSnapshotCount: (recording.codeSnapshots as any[])?.length || 0,
        eventCount: (recording.events as any[])?.length || 0,
      }),
    };

    return format === 'JSON' ? exportData : this.formatForPDF(exportData);
  }

  private calculateDuration(startTime?: Date, endTime?: Date): number {
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

  private generateShareToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}

