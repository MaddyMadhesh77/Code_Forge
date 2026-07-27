import type { Difficulty, Prisma, Problem, ProblemVisibility } from "@prisma/client";

import { ConflictError, NotFoundError } from "../../common/errors/app-error.js";
import { isNotFound, isUniqueViolation, PrismaService } from "../../database/prisma.service.js";
import type { Paginated } from "../users/users.repository.js";

export type ProblemSample = {
  input: string;
  output: string;
  explanation?: string;
};

export type ProblemSummary = {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  isPublished: boolean;
};

export type ProblemDetail = ProblemSummary & {
  description: string;
  constraints: string | null;
  samples: ProblemSample[];
  supportedLangs: string[];
  starterCode: Record<string, string>;
  editorial: string | null;
  visibility: ProblemVisibility;
  ownerId: string | null;
  teamId: string | null;
};

export type ListProblemsOptions = {
  limit?: number;
  offset?: number;
  difficulty?: Difficulty;
  tag?: string;
  search?: string;
  /** When set, unpublished problems owned by this user are included. */
  viewerId?: string;
  includeUnpublished?: boolean;
};

export type CreateProblemInput = {
  title: string;
  slug?: string;
  description: string;
  difficulty: Difficulty;
  constraints?: string | null;
  starterCode?: Record<string, string>;
  supportedLangs?: string[];
  tags?: string[];
  samples?: ProblemSample[];
  hints?: string[];
  editorial?: string | null;
  visibility?: ProblemVisibility;
  ownerId?: string | null;
  teamId?: string | null;
  isPublished?: boolean;
};

export type UpdateProblemInput = Partial<
  Omit<CreateProblemInput, "slug" | "ownerId"> & { slug: string }
>;

const MAX_PAGE_SIZE = 100;

const SUMMARY_FIELDS = {
  id: true,
  slug: true,
  title: true,
  difficulty: true,
  tags: true,
  isPublished: true,
} satisfies Prisma.ProblemSelect;

function toSummary(row: Pick<Problem, keyof typeof SUMMARY_FIELDS>): ProblemSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    difficulty: row.difficulty,
    tags: row.tags,
    isPublished: row.isPublished,
  };
}

function toDetail(row: Problem): ProblemDetail {
  return {
    ...toSummary(row),
    description: row.description,
    constraints: row.constraints,
    samples: (row.samples as ProblemSample[] | null) ?? [],
    supportedLangs: row.supportedLangs,
    starterCode: (row.starterCode as Record<string, string> | null) ?? {},
    editorial: row.editorial,
    visibility: row.visibility,
    ownerId: row.ownerId,
    teamId: row.teamId,
  };
}

export function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Single source of truth for problem lookups.
 *
 * `findByIdOrSlug` in particular replaces the ad-hoc `findProblemById` /
 * `findProblemBySlug` pair that was re-implemented in a dozen route handlers.
 */
export class ProblemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private visibilityFilter(options: ListProblemsOptions): Prisma.ProblemWhereInput {
    if (options.includeUnpublished) {
      return {};
    }

    // Published problems are public; a viewer additionally sees their own drafts.
    return options.viewerId
      ? { OR: [{ isPublished: true }, { ownerId: options.viewerId }] }
      : { isPublished: true };
  }

  async list(options: ListProblemsOptions = {}): Promise<Paginated<ProblemSummary>> {
    const limit = Math.min(Math.max(options.limit ?? 25, 1), MAX_PAGE_SIZE);
    const offset = Math.max(options.offset ?? 0, 0);

    const where: Prisma.ProblemWhereInput = {
      ...this.visibilityFilter(options),
      ...(options.difficulty ? { difficulty: options.difficulty } : {}),
      ...(options.tag ? { tags: { has: options.tag } } : {}),
      ...(options.search
        ? {
            OR: [
              { title: { contains: options.search, mode: "insensitive" } },
              { description: { contains: options.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.problem.findMany({
        where,
        select: SUMMARY_FIELDS,
        orderBy: [{ difficulty: "asc" }, { title: "asc" }],
        take: limit,
        skip: offset,
      }),
      this.prisma.problem.count({ where }),
    ]);

    return { items: rows.map(toSummary), total, limit, offset };
  }

  async findById(id: string): Promise<ProblemDetail | null> {
    const row = await this.prisma.problem.findUnique({ where: { id } });
    return row ? toDetail(row) : null;
  }

  async findBySlug(slug: string): Promise<ProblemDetail | null> {
    const row = await this.prisma.problem.findUnique({ where: { slug } });
    return row ? toDetail(row) : null;
  }

  /**
   * Resolves a path parameter that may be either an id or a slug — the two
   * are distinguishable because ids are UUIDs and slugs never are.
   */
  async findByIdOrSlug(identifier: string): Promise<ProblemDetail | null> {
    const row = await this.prisma.problem.findFirst({
      where: { OR: [{ id: identifier }, { slug: identifier }] },
    });

    return row ? toDetail(row) : null;
  }

  /** Same lookup, but throws the standard 404 so routes stay one-liners. */
  async requireByIdOrSlug(identifier: string): Promise<ProblemDetail> {
    const problem = await this.findByIdOrSlug(identifier);

    if (!problem) {
      throw new NotFoundError("Problem", "PROBLEM_NOT_FOUND");
    }

    return problem;
  }

  async getHints(identifier: string): Promise<string[]> {
    const problem = await this.requireByIdOrSlug(identifier);
    const row = await this.prisma.problem.findUnique({
      where: { id: problem.id },
      select: { hints: true },
    });

    return row?.hints ?? [];
  }

  async getReferenceSolutions(identifier: string): Promise<Array<{ language: string; code: string }>> {
    const problem = await this.requireByIdOrSlug(identifier);
    const row = await this.prisma.problem.findUnique({
      where: { id: problem.id },
      select: { referenceSolutions: true },
    });

    const solutions = (row?.referenceSolutions as Record<string, string> | null) ?? {};
    return Object.entries(solutions).map(([language, code]) => ({ language, code }));
  }

  async create(input: CreateProblemInput): Promise<ProblemDetail> {
    const slug = input.slug ?? slugify(input.title);

    try {
      const row = await this.prisma.problem.create({
        data: {
          title: input.title,
          slug,
          description: input.description,
          difficulty: input.difficulty,
          constraints: input.constraints ?? null,
          starterCode: input.starterCode ?? {},
          supportedLangs: input.supportedLangs ?? ["python", "javascript"],
          tags: input.tags ?? [],
          samples: (input.samples ?? []) as Prisma.InputJsonValue,
          hints: input.hints ?? [],
          editorial: input.editorial ?? null,
          visibility: input.visibility ?? "PRIVATE",
          ownerId: input.ownerId ?? null,
          teamId: input.teamId ?? null,
          isPublished: input.isPublished ?? false,
        },
      });

      return toDetail(row);
    } catch (error) {
      if (isUniqueViolation(error, "slug")) {
        throw new ConflictError(`A problem with slug "${slug}" already exists`, "SLUG_TAKEN");
      }
      throw error;
    }
  }

  async update(id: string, patch: UpdateProblemInput): Promise<ProblemDetail> {
    try {
      const row = await this.prisma.problem.update({
        where: { id },
        data: {
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.difficulty !== undefined ? { difficulty: patch.difficulty } : {}),
          ...(patch.constraints !== undefined ? { constraints: patch.constraints } : {}),
          ...(patch.starterCode !== undefined ? { starterCode: patch.starterCode } : {}),
          ...(patch.supportedLangs !== undefined ? { supportedLangs: patch.supportedLangs } : {}),
          ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
          ...(patch.samples !== undefined
            ? { samples: patch.samples as Prisma.InputJsonValue }
            : {}),
          ...(patch.hints !== undefined ? { hints: patch.hints } : {}),
          ...(patch.editorial !== undefined ? { editorial: patch.editorial } : {}),
          ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
          ...(patch.teamId !== undefined ? { teamId: patch.teamId } : {}),
          ...(patch.isPublished !== undefined ? { isPublished: patch.isPublished } : {}),
        },
      });

      return toDetail(row);
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundError("Problem", "PROBLEM_NOT_FOUND");
      }
      if (isUniqueViolation(error, "slug")) {
        throw new ConflictError("That slug is already taken", "SLUG_TAKEN");
      }
      throw error;
    }
  }

  async addTestCase(
    problemId: string,
    input: { input: string; expected: string; isHidden?: boolean },
  ) {
    const ordinal = await this.prisma.testCase.count({ where: { problemId } });

    return this.prisma.testCase.create({
      data: {
        problemId,
        input: input.input,
        expected: input.expected,
        isHidden: input.isHidden ?? true,
        ordinal,
      },
    });
  }

  async listTestCases(problemId: string, includeHidden: boolean) {
    return this.prisma.testCase.findMany({
      where: { problemId, ...(includeHidden ? {} : { isHidden: false }) },
      orderBy: { ordinal: "asc" },
    });
  }

  /** Idempotent: re-bookmarking is a no-op rather than a unique violation. */
  async setBookmark(userId: string, problemId: string, bookmarked: boolean): Promise<boolean> {
    if (!bookmarked) {
      await this.prisma.problemBookmark.deleteMany({ where: { userId, problemId } });
      return false;
    }

    await this.prisma.problemBookmark.upsert({
      where: { userId_problemId: { userId, problemId } },
      create: { userId, problemId },
      update: {},
    });

    return true;
  }

  async listBookmarkedIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.problemBookmark.findMany({
      where: { userId },
      select: { problemId: true },
    });

    return rows.map((row) => row.problemId);
  }
}
