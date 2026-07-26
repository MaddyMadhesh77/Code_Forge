import type {
  ListUsersOptions,
  Paginated,
  UpdateUserPatch,
  UserRecord,
  UsersRepository,
} from "./users.repository.js";
import { ForbiddenError, NotFoundError } from "../../common/errors/app-error.js";
import type { AuthenticatedUser } from "../../common/guards/jwt-auth.guard.js";

export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  listUsers(options?: ListUsersOptions): Promise<Paginated<UserRecord>> {
    return this.repository.list(options);
  }

  async getUser(userId: string): Promise<UserRecord> {
    const user = await this.repository.getById(userId);

    if (!user) {
      throw new NotFoundError("User", "USER_NOT_FOUND");
    }

    return user;
  }

  /**
   * A user may edit their own profile; anything else requires ADMIN. Without
   * this check any authenticated caller could rename another account.
   */
  async updateUser(
    actor: AuthenticatedUser,
    userId: string,
    patch: UpdateUserPatch,
  ): Promise<UserRecord> {
    if (actor.id !== userId && actor.role !== "ADMIN") {
      throw new ForbiddenError("You can only update your own profile");
    }

    return this.repository.update(userId, patch);
  }

  async deactivateUser(actor: AuthenticatedUser, userId: string): Promise<UserRecord> {
    // Self-deactivation would lock an admin out of their own tenant.
    if (actor.id === userId) {
      throw new ForbiddenError("You cannot deactivate your own account", "CANNOT_SELF_DEACTIVATE");
    }

    return this.repository.setActive(userId, false);
  }

  activateUser(userId: string): Promise<UserRecord> {
    return this.repository.setActive(userId, true);
  }
}
