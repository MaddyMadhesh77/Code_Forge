
import { PrismaService } from '../../database/prisma.service.js';
import { CreateScorecardDto } from './dto/index.js';


export class ScorecardService {
  constructor(private prisma: PrismaService) {}

  async createScorecard(
    sessionId: string,
    interviewerId: string,
    candidateId: string,
    data: CreateScorecardDto,
  ) {
    // Check if interview session exists
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Interview session not found');
    }

    // Prepare scores object
    const scores = {
      problemSolving: data.problemSolving,
      communication: data.communication,
      debugging: data.debugging,
      codeQuality: data.codeQuality,
      timeManagement: data.timeManagement,
      testingApproach: data.testingApproach,
    };

    const scorecard = await this.prisma.interviewScorecard.create({
      data: {
        sessionId,
        interviewerId,
        candidateId,
        scores,
        feedback: data.feedback,
        overallRating: data.overallRating,
      },
    });

    return scorecard;
  }

  async getScorecard(sessionId: string, interviewerId: string) {
    return await this.prisma.interviewScorecard.findUnique({
      where: {
        sessionId_interviewerId: {
          sessionId,
          interviewerId,
        },
      },
    });
  }

  async getAllScorecards(sessionId: string) {
    return await this.prisma.interviewScorecard.findMany({
      where: { sessionId },
    });
  }

  async updateScorecard(
    sessionId: string,
    interviewerId: string,
    data: CreateScorecardDto,
  ) {
    const scores = {
      problemSolving: data.problemSolving,
      communication: data.communication,
      debugging: data.debugging,
      codeQuality: data.codeQuality,
      timeManagement: data.timeManagement,
      testingApproach: data.testingApproach,
    };

    return await this.prisma.interviewScorecard.update({
      where: {
        sessionId_interviewerId: {
          sessionId,
          interviewerId,
        },
      },
      data: {
        scores,
        feedback: data.feedback,
        overallRating: data.overallRating,
      },
    });
  }

  async calculateAverageScores(sessionId: string) {
    const scorecards = await this.getAllScorecards(sessionId);

    if (scorecards.length === 0) {
      return null;
    }

    const avgScores = {
      problemSolving: 0,
      communication: 0,
      debugging: 0,
      codeQuality: 0,
      timeManagement: 0,
      testingApproach: 0,
    };

    for (const scorecard of scorecards) {
      const scores = scorecard.scores as Record<string, number>;
      for (const [key, value] of Object.entries(scores)) {
        avgScores[key as keyof typeof avgScores] += value;
      }
    }

    for (const key in avgScores) {
      avgScores[key as keyof typeof avgScores] /= scorecards.length;
    }

    return avgScores;
  }

  async generateScorecardReport(sessionId: string) {
    const scorecards = await this.getAllScorecards(sessionId);
    const avgScores = await this.calculateAverageScores(sessionId);

    return {
      sessionId,
      totalInterviewers: scorecards.length,
      scorecards,
      averageScores: avgScores,
      highestRatedCriteria: this.getHighestRatedCriteria(avgScores),
      lowestRatedCriteria: this.getLowestRatedCriteria(avgScores),
    };
  }

  private getHighestRatedCriteria(scores: any): string | null {
    if (!scores) return null;
    return Object.entries(scores).reduce((a, b) =>
      (b[1] as number) > (a[1] as number) ? b : a,
    )[0] as string;
  }

  private getLowestRatedCriteria(scores: any): string | null {
    if (!scores) return null;
    return Object.entries(scores).reduce((a, b) =>
      (b[1] as number) < (a[1] as number) ? b : a,
    )[0] as string;
  }
}

