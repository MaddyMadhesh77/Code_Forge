import type {
  CreateInterviewDto,
  CreateSessionLinkDto,
  JoinInterviewDto,
} from "../dto/index.js";
import { InterviewsService } from "../interviews.service.js";
import { InterviewProductService } from "../interview-product.service.js";
import { BadRequestError } from "../../../common/errors/app-error.js";
import type { AuthenticatedUser } from "../../../common/guards/jwt-auth.guard.js";

/**
 * Creating, listing and ending interviews, plus the invite links that let
 * people join them.
 *
 * One of five controllers carved out of a single 34-method `InterviewsController`
 * that took eleven constructor dependencies. Each now owns one area and takes
 * only the services that area needs.
 */
export class InterviewLifecycleController {
  constructor(
    private readonly interviews: InterviewsService,
    private readonly products: InterviewProductService,
  ) {}

  async createInterview(user: AuthenticatedUser, data: CreateInterviewDto) {
    const template = data.templateId ? this.products.getTemplate(data.templateId) : null;

    const problemId = data.problemId ?? template?.problemIds[0];

    if (!problemId) {
      throw new BadRequestError(
        "Either problemId or templateId must be provided",
        undefined,
        "MISSING_PROBLEM",
      );
    }

    return this.interviews.createInterview(user.id, {
      ...data,
      problemId,
      role: data.role ?? template?.role,
      level: data.level ?? template?.level ?? "MID",
    });
  }

  listInterviews(user: AuthenticatedUser, limit = 10, offset = 0) {
    return this.interviews.listInterviews(user.id, limit, offset);
  }

  getInterview(sessionId: string) {
    return this.interviews.getInterview(sessionId);
  }

  updateStatus(sessionId: string, status: string) {
    return this.interviews.updateInterviewStatus(sessionId, status);
  }

  endSession(sessionId: string) {
    return this.interviews.endSession(sessionId);
  }

  createSessionLink(sessionId: string, user: AuthenticatedUser, data: CreateSessionLinkDto) {
    return this.interviews.createSessionLink(sessionId, user.id, data);
  }

  getSessionLinks(sessionId: string, user: AuthenticatedUser) {
    return this.interviews.getSessionLinks(sessionId, user.id);
  }

  revokeSessionLink(linkId: string, user: AuthenticatedUser) {
    return this.interviews.revokeSessionLink(linkId, user.id);
  }

  joinSession(user: AuthenticatedUser, data: JoinInterviewDto) {
    return this.interviews.joinSession(data, user.id);
  }
}
