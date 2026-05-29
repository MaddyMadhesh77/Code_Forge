
import { PrismaService } from '../../database/prisma.service.js';
import { CreateInterviewDto, CreateSessionLinkDto, JoinInterviewDto } from './dto/index.js';
import * as crypto from 'crypto';


export class InterviewsService {
  constructor(private prisma: PrismaService) {}

  async createInterview(userId: string, data: CreateInterviewDto) {
    if (!data.problemId) {
      throw new Error('Problem is required to create an interview');
    }

    // Verify problem exists
    const problem = await this.prisma.problem.findUnique({
      where: { id: data.problemId },
    });

    if (!problem) {
      throw new Error('Problem not found');
    }

    const session = await this.prisma.interviewSession.create({
      data: {
        title: data.title,
        creatorId: userId,
        templateId: data.templateId ?? null,
        role: data.role ?? null,
        level: data.level ?? null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        participants: {
          create: {
            userId,
            role: 'INTERVIEWER',
          },
        },
        problems: {
          create: {
            problemId: data.problemId,
            ordinal: 0,
          },
        },
      },
      include: {
        participants: true,
        problems: true,
      },
    });

    // Start recording
    await this.prisma.interviewRecording.create({
      data: {
        sessionId: session.id,
      },
    });

    return session;
  }

  async getInterview(sessionId: string) {
    return await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
                avatarUrl: true,
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
  }

  async listInterviews(userId: string, limit = 10, offset = 0) {
    return await this.prisma.interviewSession.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: true,
        problems: true,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateInterviewStatus(sessionId: string, status: string) {
    if (!['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
      throw new Error('Invalid status');
    }

    return await this.prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: status as any,
        startedAt: status === 'ACTIVE' ? new Date() : undefined,
        endedAt: status === 'COMPLETED' || status === 'CANCELLED' ? new Date() : undefined,
      },
    });
  }

  async createSessionLink(sessionId: string, userId: string, data: CreateSessionLinkDto) {
    // Verify user is creator/interviewer
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { participants: true },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const isAuthorized = session.creatorId === userId || 
      session.participants.some((p: any) => p.userId === userId && p.role === 'INTERVIEWER');

    if (!isAuthorized) {
      throw new Error('Not authorized to create session links');
    }

    const token = this.generateSecureToken();
    const expiresAt = data.expiresIn
      ? new Date(Date.now() + data.expiresIn * 1000)
      : null;

    return await this.prisma.sessionLink.create({
      data: {
        sessionId,
        role: data.role,
        token,
        expiresAt,
        createdBy: userId,
      },
    });
  }

  async joinSession(data: JoinInterviewDto, userId: string) {
    const link = await this.prisma.sessionLink.findUnique({
      where: { token: data.token },
      include: { session: true },
    });

    if (!link) {
      throw new Error('Invalid or expired link');
    }

    if (link.isRevoked) {
      throw new Error('This link has been revoked');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new Error('This link has expired');
    }

    // Check if user already in session
    const existing = await this.prisma.sessionParticipant.findFirst({
      where: {
        sessionId: link.sessionId,
        userId,
      },
    });

    if (existing) {
      return link.session;
    }

    // Add participant
    await this.prisma.sessionParticipant.create({
      data: {
        sessionId: link.sessionId,
        userId,
        role: link.role,
      },
    });

    return link.session;
  }

  async revokeSessionLink(linkId: string, userId: string) {
    const link = await this.prisma.sessionLink.findUnique({
      where: { id: linkId },
      include: { session: true },
    });

    if (!link) {
      throw new Error('Link not found');
    }

    // Verify authorization
    if (link.session.creatorId !== userId && link.createdBy !== userId) {
      throw new Error('Not authorized to revoke this link');
    }

    return await this.prisma.sessionLink.update({
      where: { id: linkId },
      data: { isRevoked: true },
    });
  }

  async getSessionLinks(sessionId: string, userId: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Verify authorization
    if (session.creatorId !== userId) {
      throw new Error('Not authorized');
    }

    return await this.prisma.sessionLink.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async endSession(sessionId: string) {
    return await this.updateInterviewStatus(sessionId, 'COMPLETED');
  }

  private generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

