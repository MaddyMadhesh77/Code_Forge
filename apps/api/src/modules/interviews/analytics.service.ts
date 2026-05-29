
import { PrismaService } from '../../database/prisma.service.js';

interface DailyTrendPoint {
  date: string;
  sessions: number;
  submissions: number;
}


export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getInterviewDashboard(days = 14) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const sessions = await this.prisma.interviewSession.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        submissions: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const allSubmissions = sessions.flatMap((session: any) => session.submissions ?? []);
    const completedSessions = sessions.filter((session: any) => session.status === 'COMPLETED');

    const avgDurationMinutes = this.calculateAverageDurationMinutes(completedSessions);
    const submissionsByLanguage: Record<string, number> = {};
    const verdictBreakdown: Record<string, number> = {};
    for (const submission of allSubmissions as any[]) {
      submissionsByLanguage[submission.language] = (submissionsByLanguage[submission.language] ?? 0) + 1;
      verdictBreakdown[submission.verdict] = (verdictBreakdown[submission.verdict] ?? 0) + 1;
    }

    return {
      rangeDays: days,
      summary: {
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        completionRate: sessions.length > 0 ? completedSessions.length / sessions.length : 0,
        avgDurationMinutes,
        totalSubmissions: allSubmissions.length,
      },
      submissionsByLanguage,
      verdictBreakdown,
      dailyTrend: this.buildDailyTrend(sessions, allSubmissions),
    };
  }

  private calculateAverageDurationMinutes(
    sessions: Array<{ startedAt: Date | null; endedAt: Date | null }>,
  ): number {
    const durations = sessions
      .filter((s) => s.startedAt && s.endedAt)
      .map((s) => {
        const startedAt = s.startedAt as Date;
        const endedAt = s.endedAt as Date;
        return (endedAt.getTime() - startedAt.getTime()) / (1000 * 60);
      });

    if (durations.length === 0) {
      return 0;
    }

    return Number((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2));
  }

  private buildDailyTrend(
    sessions: Array<{ createdAt: Date }>,
    submissions: Array<{ submittedAt: Date }>,
  ): DailyTrendPoint[] {
    const buckets = new Map<string, DailyTrendPoint>();

    const upsert = (date: string) => {
      if (!buckets.has(date)) {
        buckets.set(date, {
          date,
          sessions: 0,
          submissions: 0,
        });
      }
      return buckets.get(date) as DailyTrendPoint;
    };

    for (const session of sessions) {
      const date = session.createdAt.toISOString().slice(0, 10);
      upsert(date).sessions += 1;
    }

    for (const submission of submissions) {
      const date = submission.submittedAt.toISOString().slice(0, 10);
      upsert(date).submissions += 1;
    }

    return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
}

