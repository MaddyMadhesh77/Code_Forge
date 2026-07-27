import type { AuthUser } from "@codeforge/shared";

export type UserRecord = AuthUser & {
  avatarUrl: string | null;
  isActive: boolean;
};

/** Adds the credential column; never leaves the auth/user data layer. */
export type UserWithSecret = UserRecord & { passwordHash: string };

export type UpdateUserPatch = {
  displayName?: string;
  avatarUrl?: string | null;
};

export type CreateUserInput = {
  email: string;
  displayName: string;
  passwordHash: string;
  role?: AuthUser["role"];
};

export type ListUsersOptions = {
  limit?: number;
  offset?: number;
  includeInactive?: boolean;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * Persistence contract for users. Implemented against Prisma in production and
 * exercised directly in tests, so callers never depend on the storage engine.
 */
export interface UsersRepository {
  list(options?: ListUsersOptions): Promise<Paginated<UserRecord>>;
  getById(id: string): Promise<UserRecord | null>;
  getByEmail(email: string): Promise<UserRecord | null>;
  /** Includes the password hash — only the auth flow should call this. */
  getByEmailWithSecret(email: string): Promise<UserWithSecret | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
  update(id: string, patch: UpdateUserPatch): Promise<UserRecord>;
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<UserRecord>;
}
