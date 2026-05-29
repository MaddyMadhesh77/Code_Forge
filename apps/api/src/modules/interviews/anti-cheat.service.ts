
import { PrismaService } from '../../database/prisma.service.js';
import { AntiCheatEventType } from '@codeforge/shared';


export class AntiCheatService {
  private readonly SEVERITY_MAP: Record<AntiCheatEventType, number> = {
    TAB_SWITCH: 2,
    COPY_ATTEMPT: 3,
    PASTE_ATTEMPT: 3,
    WINDOW_BLUR: 1,
    EXTERNAL_TOOL_DETECTED: 5,
  };

  private readonly ALERT_THRESHOLD = 5;
  private readonly ALERT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private prisma: PrismaService) {}

  async recordEvent(
    sessionId: string,
    participantId: string,
    eventType: AntiCheatEventType,
    details?: Record<string, any>,
  ) {
    const severity = this.SEVERITY_MAP[eventType] || 1;

    const event = await this.prisma.antiCheatEvent.create({
      data: {
        sessionId,
        participantId,
        eventType,
        severity,
        details: details || {},
      },
    });

    // Check if we should alert
    await this.checkAndAlertIfNeeded(sessionId, participantId);

    return event;
  }

  async getSessionEvents(sessionId: string) {
    return await this.prisma.antiCheatEvent.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getParticipantEvents(sessionId: string, participantId: string) {
    return await this.prisma.antiCheatEvent.findMany({
      where: { sessionId, participantId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getSeverityScore(sessionId: string, participantId: string): Promise<number> {
    const events = await this.getParticipantEvents(sessionId, participantId);
    return events.reduce((sum: number, event: any) => sum + event.severity, 0);
  }

  async getCheatingRiskLevel(
    sessionId: string,
    participantId: string,
  ): Promise<'LOW' | 'MEDIUM' | 'HIGH'> {
    const score = await this.getSeverityScore(sessionId, participantId);

    if (score >= 15) return 'HIGH';
    if (score >= 8) return 'MEDIUM';
    return 'LOW';
  }

  private async checkAndAlertIfNeeded(sessionId: string, participantId: string) {
    const recentEvents = await this.prisma.antiCheatEvent.findMany({
      where: {
        sessionId,
        participantId,
        timestamp: {
          gte: new Date(Date.now() - this.ALERT_WINDOW_MS),
        },
      },
    });

    const totalSeverity = recentEvents.reduce((sum: number, e: any) => sum + e.severity, 0);

    if (totalSeverity > this.ALERT_THRESHOLD) {
      // Emit alert event (would emit via WebSocket gateway in production)
      console.warn(
        `Anti-cheat alert for participant ${participantId} in session ${sessionId}. Severity: ${totalSeverity}`,
      );
    }
  }

  async generateAntiCheatReport(sessionId: string) {
    const events = await this.getSessionEvents(sessionId);
    const participants = new Map<string, any>();

    for (const event of events) {
      if (!participants.has(event.participantId)) {
        participants.set(event.participantId, {
          participantId: event.participantId,
          eventCount: 0,
          severity: 0,
          events: [],
        });
      }

      const data = participants.get(event.participantId);
      data.eventCount++;
      data.severity += event.severity;
      data.events.push(event);
    }

    const report = Array.from(participants.values()).map((p) => ({
      ...p,
      riskLevel: this.getRiskLevelForScore(p.severity),
    }));

    return report;
  }

  private getRiskLevelForScore(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (score >= 15) return 'HIGH';
    if (score >= 8) return 'MEDIUM';
    return 'LOW';
  }
}

