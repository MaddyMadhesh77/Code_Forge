import type { CreateScorecardDto } from "../dto/index.js";
import { AntiCheatService } from "../anti-cheat.service.js";
import { InterviewProductService } from "../interview-product.service.js";
import { InterviewsService } from "../interviews.service.js";
import { ScorecardService } from "../scorecard.service.js";
import { NotFoundError } from "../../../common/errors/app-error.js";
import type { AuthenticatedUser } from "../../../common/guards/jwt-auth.guard.js";

/**
 * Assessment: scorecards and proctoring signals.
 */
export class InterviewAssessmentController {
  constructor(
    private readonly scorecards: ScorecardService,
    private readonly antiCheat: AntiCheatService,
    private readonly interviews: InterviewsService,
    private readonly products: InterviewProductService,
  ) {}

  async createScorecard(
    sessionId: string,
    user: AuthenticatedUser,
    data: CreateScorecardDto,
  ) {
    const session = await this.interviews.getInterview(sessionId);

    if (!session) {
      throw new NotFoundError("Interview session", "SESSION_NOT_FOUND");
    }

    const candidate = session.participants.find(
      (participant) => participant.role === "CANDIDATE",
    );

    const scorecard = await this.scorecards.createScorecard(
      sessionId,
      user.id,
      candidate?.userId ?? null,
      data,
    );

    // Feed the calibration ledger so bias and drift analytics have data.
    if (candidate) {
      const questionDifficulty = session.problems[0]?.problem?.difficulty ?? "MEDIUM";

      this.products.recordScorecard({
        sessionId,
        sessionTitle: session.title,
        interviewerId: user.id,
        interviewerName: user.id,
        candidateId: candidate.userId,
        candidateName: candidate.user?.displayName ?? candidate.userId,
        role: session.role ?? "INTERVIEWER",
        level: session.level ?? "MID",
        difficulty:
          questionDifficulty === "HARD" ? 3 : questionDifficulty === "MEDIUM" ? 2 : 1,
        scores: scorecard.scores as Record<string, number>,
        overallRating: scorecard.overall,
      });
    }

    return scorecard;
  }

  getScorecard(sessionId: string, user: AuthenticatedUser) {
    return this.scorecards.getScorecard(sessionId, user.id);
  }

  getAllScorecards(sessionId: string) {
    return this.scorecards.getAllScorecards(sessionId);
  }

  getScorecardReport(sessionId: string) {
    return this.scorecards.generateScorecardReport(sessionId);
  }

  getAntiCheatReport(sessionId: string) {
    return this.antiCheat.generateAntiCheatReport(sessionId);
  }

  getAntiCheatEvents(sessionId: string) {
    return this.antiCheat.getSessionEvents(sessionId);
  }
}
