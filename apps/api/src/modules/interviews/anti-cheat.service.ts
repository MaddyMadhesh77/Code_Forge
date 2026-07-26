import type { AntiCheatEventType, Prisma } from "@prisma/client";

import { logger } from "../../common/logging/logger.js";
import { PrismaService } from "../../database/prisma.service.js";

const log = logger.child("AntiCheat");

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type ParticipantRisk = {
  participantId: string;
  eventCount: number;
  severity: number;
  riskLevel: RiskLevel;
};

/**
 * Proctoring signal collection and risk scoring.
 *
 * Events are persisted, so a report generated after the session still cites
 * the evidence that produced its risk score.
 */
export class AntiCheatService {
  /** How much each signal contributes to a participant's risk score. */
  private readonly SEVERITY_MAP: Record<AntiCheatEventType, number> = {
    TAB_SWITCH: 2,
    COPY_ATTEMPT: 3,
    PASTE_ATTEMPT: 3,
    WINDOW_BLUR: 1,
    EXTERNAL_TOOL_DETECTED: 5,
  };

  private readonly ALERT_THRESHOLD = 5;
  private readonly ALERT_WINDOW_MS = 5 * 60 * 1000;

  private readonly HIGH_RISK_SCORE = 15;
  private readonly MEDIUM_RISK_SCORE = 8;

  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(
    sessionId: string,
    participantId: string,
    eventType: AntiCheatEventType,
    details?: Record<string, unknown>,
  ) {
    const event = await this.prisma.antiCheatEvent.create({
      data: {
        sessionId,
        participantId,
        eventType,
        severity: this.SEVERITY_MAP[eventType] ?? 1,
        details: (details ?? {}) as Prisma.InputJsonValue,
      },
    });

    await this.alertIfThresholdExceeded(sessionId, participantId);
    return event;
  }

  getSessionEvents(sessionId: string) {
    return this.prisma.antiCheatEvent.findMany({
      where: { sessionId },
      orderBy: { timestamp: "asc" },
    });
  }

  getParticipantEvents(sessionId: string, participantId: string) {
    return this.prisma.antiCheatEvent.findMany({
      where: { sessionId, participantId },
      orderBy: { timestamp: "asc" },
    });
  }

  /** Summed in the database rather than by loading every row. */
  async getSeverityScore(sessionId: string, participantId: string): Promise<number> {
    const result = await this.prisma.antiCheatEvent.aggregate({
      where: { sessionId, participantId },
      _sum: { severity: true },
    });

    return result._sum.severity ?? 0;
  }

  async getCheatingRiskLevel(sessionId: string, participantId: string): Promise<RiskLevel> {
    return this.riskLevelFor(await this.getSeverityScore(sessionId, participantId));
  }

  async generateAntiCheatReport(sessionId: string): Promise<ParticipantRisk[]> {
    // Aggregate per participant in one query instead of grouping in memory.
    const grouped = await this.prisma.antiCheatEvent.groupBy({
      by: ["participantId"],
      where: { sessionId },
      _count: { _all: true },
      _sum: { severity: true },
    });

    return grouped
      .map((row) => {
        const severity = row._sum.severity ?? 0;

        return {
          participantId: row.participantId,
          eventCount: row._count._all,
          severity,
          riskLevel: this.riskLevelFor(severity),
        };
      })
      .sort((a, b) => b.severity - a.severity);
  }

  private riskLevelFor(score: number): RiskLevel {
    if (score >= this.HIGH_RISK_SCORE) return "HIGH";
    if (score >= this.MEDIUM_RISK_SCORE) return "MEDIUM";
    return "LOW";
  }

  private async alertIfThresholdExceeded(
    sessionId: string,
    participantId: string,
  ): Promise<void> {
    const recent = await this.prisma.antiCheatEvent.aggregate({
      where: {
        sessionId,
        participantId,
        timestamp: { gte: new Date(Date.now() - this.ALERT_WINDOW_MS) },
      },
      _sum: { severity: true },
    });

    const totalSeverity = recent._sum.severity ?? 0;

    if (totalSeverity > this.ALERT_THRESHOLD) {
      log.warn("Anti-cheat threshold exceeded", {
        sessionId,
        participantId,
        totalSeverity,
        windowMs: this.ALERT_WINDOW_MS,
      });
    }
  }
}
