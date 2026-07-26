import type { Prisma, User } from "@prisma/client";

import type {
  CreateUserInput,
  ListUsersOptions,
  Paginated,
  UpdateUserPatch,
  UserRecord,
  UsersRepository,
  UserWithSecret,
} from "./users.repository.js";
import { ConflictError, NotFoundError } from "../../common/errors/app-error.js";
import { isNotFound, isUniqueViolation, PrismaService } from "../../database/prisma.service.js";

const MAX_PAGE_SIZE = 100;

/** Field selection that deliberately omits `passwordHash`. */
const PUBLIC_FIELDS = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  avatarUrl: true,
  isActive: true,
} satisfies Prisma.UserSelect;

type PublicUser = Pick<User, keyof typeof PUBLIC_FIELDS>;

function toRecord(user: PublicUser): UserRecord {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
  };
}

/** Emails are stored and compared lowercased so `A@x.com` can't shadow `a@x.com`. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(options: ListUsersOptions = {}): Promise<Paginated<UserRecord>> {
    const limit = Math.min(Math.max(options.limit ?? 25, 1), MAX_PAGE_SIZE);
    const offset = Math.max(options.offset ?? 0, 0);
    const where: Prisma.UserWhereInput = options.includeInactive ? {} : { isActive: true };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: PUBLIC_FIELDS,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: rows.map(toRecord), total, limit, offset };
  }

  async getById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: PUBLIC_FIELDS });
    return user ? toRecord(user) : null;
  }

  async getByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
      select: PUBLIC_FIELDS,
    });
    return user ? toRecord(user) : null;
  }

  async getByEmailWithSecret(email: string): Promise<UserWithSecret | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
      select: { ...PUBLIC_FIELDS, passwordHash: true },
    });

    return user ? { ...toRecord(user), passwordHash: user.passwordHash } : null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: normalizeEmail(input.email),
          displayName: input.displayName,
          passwordHash: input.passwordHash,
          role: input.role ?? "CANDIDATE",
        },
        select: PUBLIC_FIELDS,
      });

      return toRecord(user);
    } catch (error) {
      if (isUniqueViolation(error, "email")) {
        throw new ConflictError("A user with that email already exists", "EMAIL_ALREADY_EXISTS");
      }
      throw error;
    }
  }

  async update(id: string, patch: UpdateUserPatch): Promise<UserRecord> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
          ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl } : {}),
        },
        select: PUBLIC_FIELDS,
      });

      return toRecord(user);
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundError("User", "USER_NOT_FOUND");
      }
      throw error;
    }
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    try {
      await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundError("User", "USER_NOT_FOUND");
      }
      throw error;
    }
  }

  async setActive(id: string, isActive: boolean): Promise<UserRecord> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { isActive },
        select: PUBLIC_FIELDS,
      });

      return toRecord(user);
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundError("User", "USER_NOT_FOUND");
      }
      throw error;
    }
  }
}
