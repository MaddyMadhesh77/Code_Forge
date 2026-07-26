import type { Prisma } from "@prisma/client";
import type { CodeSnapshot, InterviewEvent, RecordingArtifact } from "@codeforge/shared";

import { NotFoundError } from "../../common/errors/app-error.js";
import { PrismaService } from "../../database/prisma.service.js";

export type RecordingSummary = {
  id: string;
  sessionId: string;
  status: string;
  startedAt: string;
  stoppedAt: string | null;
  durationMs: number;
  eventCount: number;
  snapshotCount: number;
};

/**
 * Records the timeline of an interview: events, code snapshots and media
 * artifacts.
 *
 * Events and snapshots are append-only rows. They were previously JSON arrays
 * updated with a read-modify-write, which silently dropped an event whenever
 * two arrived at the same time — exactly the situation a live interview
 * produces.
 */
export class RecordingService {
  constructor(private readonly prisma: PrismaService) {}

  async startRecording(sessionId: string) {
    // Idempotent: reconnecting a client must not orphan the first recording.
    return this.prisma.interviewRecording.upsert({
      where: { sessionId },
      create: { sessionId, status: "RECORDING" },
      update: { status: "RECORDING", stoppedAt: null },
    });
  }

  async addEvent(sessionId: string, event: InterviewEvent) {
    const recording = await this.requireRecording(sessionId);

    return this.prisma.recordingEvent.create({
      data: { recordingId: recording.id, payload: event as Prisma.InputJsonValue },
    });
  }

  async addCodeSnapshot(sessionId: string, snapshot: CodeSnapshot) {
    const recording = await this.requireRecording(sessionId);

    return this.prisma.codeSnapshot.create({
      data: { recordingId: recording.id, payload: snapshot as Prisma.InputJsonValue },
    });
  }

  async stopRecording(sessionId: string) {
    const recording = await this.requireRecording(sessionId);

    return this.prisma.interviewRecording.update({
      where: { id: recording.id },
      data: { status: "READY", stoppedAt: new Date() },
    });
  }

  async getRecording(sessionId: string): Promise<RecordingSummary | null> {
    const recording = await this.prisma.interviewRecording.findUnique({
      where: { sessionId },
      include: { _count: { select: { events: true, snapshots: true } } },
    });

    if (!recording) {
      return null;
    }

    const endTime = recording.stoppedAt?.getTime() ?? Date.now();

    return {
      id: recording.id,
      sessionId: recording.sessionId,
      status: recording.status,
      startedAt: recording.startedAt.toISOString(),
      stoppedAt: recording.stoppedAt?.toISOString() ?? null,
      durationMs: endTime - recording.startedAt.getTime(),
      eventCount: recording._count.events,
      snapshotCount: recording._count.snapshots,
    };
  }

  /** Paginated: a long interview can accumulate thousands of events. */
  async getRecordingEvents(sessionId: string, limit = 1_000, offset = 0) {
    const recording = await this.prisma.interviewRecording.findUnique({
      where: { sessionId },
      select: { id: true },
    });

    if (!recording) {
      return [];
    }

    const rows = await this.prisma.recordingEvent.findMany({
      where: { recordingId: recording.id },
      orderBy: { timestamp: "asc" },
      take: Math.min(Math.max(limit, 1), 5_000),
      skip: Math.max(offset, 0),
    });

    return rows.map((row) => ({ event: row.payload, timestamp: row.timestamp.getTime() }));
  }

  async getCodeSnapshots(sessionId: string, limit = 1_000, offset = 0) {
    const recording = await this.prisma.interviewRecording.findUnique({
      where: { sessionId },
      select: { id: true },
    });

    if (!recording) {
      return [];
    }

    const rows = await this.prisma.codeSnapshot.findMany({
      where: { recordingId: recording.id },
      orderBy: { timestamp: "asc" },
      take: Math.min(Math.max(limit, 1), 5_000),
      skip: Math.max(offset, 0),
    });

    return rows.map((row) => row.payload);
  }

  async saveRecordingArtifact(
    sessionId: string,
    payload: {
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      durationMs?: number;
      source?: string;
      storageUrl?: string;
    },
  ): Promise<RecordingArtifact> {
    const recording = await this.requireRecording(sessionId);

    const artifact = await this.prisma.recordingArtifact.create({
      data: {
        recordingId: recording.id,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        sizeBytes: payload.sizeBytes,
        durationMs: payload.durationMs ?? null,
        source: payload.source ?? null,
        storageUrl: payload.storageUrl ?? null,
      },
    });

    return toArtifact(artifact);
  }

  async getRecordingArtifacts(sessionId: string): Promise<RecordingArtifact[]> {
    const recording = await this.prisma.interviewRecording.findUnique({
      where: { sessionId },
      select: { id: true },
    });

    if (!recording) {
      return [];
    }

    const rows = await this.prisma.recordingArtifact.findMany({
      where: { recordingId: recording.id },
      orderBy: { createdAt: "desc" },
    });

    return rows.map(toArtifact);
  }

  private async requireRecording(sessionId: string) {
    const recording = await this.prisma.interviewRecording.findUnique({
      where: { sessionId },
      select: { id: true },
    });

    if (!recording) {
      throw new NotFoundError("Recording", "RECORDING_NOT_FOUND");
    }

    return recording;
  }
}

function toArtifact(row: {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number | null;
  source: string | null;
  storageUrl: string | null;
  createdAt: Date;
}): RecordingArtifact {
  return {
    id: row.id,
    type: "video-artifact",
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    ...(row.durationMs !== null ? { durationMs: row.durationMs } : {}),
    ...(row.source ? { source: row.source as "webcam" | "screen" } : {}),
    ...(row.storageUrl ? { storageUrl: row.storageUrl } : {}),
    createdAt: row.createdAt.getTime(),
  };
}
