import {
  ProblemsRepository,
  slugify,
  type CreateProblemInput,
  type ListProblemsOptions,
  type ProblemDetail,
  type ProblemSummary,
  type UpdateProblemInput,
} from "./problems.repository.js";
import { ForbiddenError } from "../../common/errors/app-error.js";
import type { AuthenticatedUser } from "../../common/guards/jwt-auth.guard.js";
import type { Paginated } from "../users/users.repository.js";

/**
 * Problem catalogue operations.
 *
 * All reads and writes go through `ProblemsRepository`, which is the single
 * place problem lookup happens — previously the same find-by-id logic was
 * re-implemented in a dozen route handlers, each with slightly different
 * not-found behaviour.
 */
export class ProblemsService {
  constructor(private readonly repository: ProblemsRepository) {}

  listPublished(options: ListProblemsOptions = {}): Promise<Paginated<ProblemSummary>> {
    return this.repository.list(options);
  }

  getByIdOrSlug(identifier: string): Promise<ProblemDetail> {
    return this.repository.requireByIdOrSlug(identifier);
  }

  getHints(identifier: string): Promise<string[]> {
    return this.repository.getHints(identifier);
  }

  getReferenceSolutions(identifier: string, language?: string) {
    return this.repository.getReferenceSolutions(identifier).then((solutions) =>
      language ? solutions.filter((entry) => entry.language === language) : solutions,
    );
  }

  createProblem(actor: AuthenticatedUser, input: Omit<CreateProblemInput, "ownerId">) {
    return this.repository.create({
      ...input,
      slug: input.slug ?? slugify(input.title),
      ownerId: actor.id,
    });
  }

  /** Only the owner or an ADMIN may edit a problem. */
  async updateProblem(
    actor: AuthenticatedUser,
    identifier: string,
    patch: UpdateProblemInput,
  ): Promise<ProblemDetail> {
    const problem = await this.repository.requireByIdOrSlug(identifier);
    this.assertCanEdit(actor, problem);
    return this.repository.update(problem.id, patch);
  }

  async addTestCase(
    actor: AuthenticatedUser,
    identifier: string,
    input: { input: string; expected: string; isHidden?: boolean },
  ) {
    const problem = await this.repository.requireByIdOrSlug(identifier);
    this.assertCanEdit(actor, problem);
    return this.repository.addTestCase(problem.id, input);
  }

  /**
   * Hidden test cases are only returned to someone who may edit the problem —
   * exposing them to candidates would let them hard-code the expected output.
   */
  async listTestCases(actor: AuthenticatedUser | null, identifier: string) {
    const problem = await this.repository.requireByIdOrSlug(identifier);
    const canSeeHidden = Boolean(actor && this.canEdit(actor, problem));
    return this.repository.listTestCases(problem.id, canSeeHidden);
  }

  async setBookmark(actor: AuthenticatedUser, identifier: string, bookmarked: boolean) {
    const problem = await this.repository.requireByIdOrSlug(identifier);
    const result = await this.repository.setBookmark(actor.id, problem.id, bookmarked);
    return { problemId: problem.id, bookmarked: result };
  }

  listBookmarks(actor: AuthenticatedUser) {
    return this.repository.listBookmarkedIds(actor.id);
  }

  async shareWithTeam(actor: AuthenticatedUser, identifier: string, teamId: string) {
    const problem = await this.repository.requireByIdOrSlug(identifier);
    this.assertCanEdit(actor, problem);
    return this.repository.update(problem.id, { teamId, visibility: "TEAM" });
  }

  private canEdit(actor: AuthenticatedUser, problem: ProblemDetail): boolean {
    return actor.role === "ADMIN" || problem.ownerId === actor.id;
  }

  private assertCanEdit(actor: AuthenticatedUser, problem: ProblemDetail): void {
    if (!this.canEdit(actor, problem)) {
      throw new ForbiddenError("You do not have permission to modify this problem");
    }
  }
}
