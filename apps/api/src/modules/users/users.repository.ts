import type { AuthUser } from "../../../../../packages/shared/src/schemas/auth.schema.js";

export type UserRecord = AuthUser & {
  avatarUrl: string | null;
  isActive: boolean;
};

export type UpdateUserPatch = {
  displayName?: string;
  avatarUrl?: string | null;
};

export interface UsersRepository {
  list(): UserRecord[];
  getById(id: string): UserRecord | undefined;
  update(id: string, patch: UpdateUserPatch): UserRecord;
  setActive(id: string, isActive: boolean): UserRecord;
}
