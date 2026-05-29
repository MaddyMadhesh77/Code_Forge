
import { PrismaService } from '../../database/prisma.service.js';
import { InterviewEvent, RecordingEvent, CodeSnapshot } from '@codeforge/shared';

interface RecordingArtifact {
  type: 'video-artifact';
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationMs?: number;
  source?: string;
  storageUrl?: string;
  createdAt: number;
}


export class RecordingService {
  constructor(private prisma: PrismaService) {}

  async startRecording(sessionId: string) {
    return await this.prisma.interviewRecording.create({
      data: {
        sessionId,
        events: [],
        codeSnapshots: [],
      },
    });
  }

  async addEvent(sessionId: string, event: InterviewEvent) {
    const recording = await this.prisma.interviewRecording.findUnique({
      where: { sessionId },
    });

    if (!recording) {
      throw new Error(`Recording not found for session ${sessionId}`);
    }

    const events = (recording.events as RecordingEvent[]) || [];
    events.push({
      event,
      timestamp: Date.now(),
    });

    return await this.prisma.interviewRecording.update({
      where: { sessionId },
      data: { events },
    });
  }

  async addCodeSnapshot(sessionId: string, snapshot: CodeSnapshot) {
    const recording = await this.prisma.interviewRecording.findUnique({
      where: { sessionId },
    });

    if (!recording) {
      throw new Error(`Recording not found for session ${sessionId}`);
    }

    const snapshots = (recording.codeSnapshots as CodeSnapshot[]) || [];
    snapshots.push(snapshot);

    return await this.prisma.interviewRecording.update({
      where: { sessionId },
      data: { codeSnapshots: snapshots },
    });
  }

  async stopRecording(sessionId: string) {
    return await this.prisma.interviewRecording.update({
      where: { sessionId },
      data: { stoppedAt: new Date() },
    });
  }

  async getRecording(sessionId: string) {
    const recording = await this.prisma.interviewRecording.findUnique({
      where: { sessionId },
    });

    if (!recording) {
      return null;
    }

    const startTime = recording.startedAt.getTime();
    const endTime = recording.stoppedAt
      ? recording.stoppedAt.getTime()
      : Date.now();

    return {
      ...recording,
      duration: endTime - startTime,
    };
  }

  async getRecordingEvents(sessionId: string) {
    const recording = await this.getRecording(sessionId);
    return recording?.events || [];
  }

  async getCodeSnapshots(sessionId: string) {
    const recording = await this.getRecording(sessionId);
    return recording?.codeSnapshots || [];
  }

  async saveRecordingArtifact(
    sessionId: string,
    payload: Omit<RecordingArtifact, 'type' | 'id' | 'createdAt'>,
  ) {
    const recording = await this.prisma.interviewRecording.findUnique({
      where: { sessionId },
    });

    if (!recording) {
      throw new Error(`Recording not found for session ${sessionId}`);
    }

    const events = ((recording.events as any[]) || []).slice();
    const artifact: RecordingArtifact = {
      type: 'video-artifact',
      id: `artifact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      ...payload,
    };

    events.push({
      event: artifact,
      timestamp: artifact.createdAt,
    });

    await this.prisma.interviewRecording.update({
      where: { sessionId },
      data: { events },
    });

    return artifact;
  }

  async getRecordingArtifacts(sessionId: string) {
    const recording = await this.getRecording(sessionId);
    const events = (recording?.events || []) as Array<{ event?: any }>;

    return events
      .map((entry) => entry.event)
      .filter((event): event is RecordingArtifact => event?.type === 'video-artifact')
      .sort((a, b) => b.createdAt - a.createdAt);
  }
}

