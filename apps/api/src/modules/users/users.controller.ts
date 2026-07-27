import type { AuthenticatedUser } from "../../common/guards/jwt-auth.guard.js";
import type { ListUsersOptions, UpdateUserPatch } from "./users.repository.js";
import { UsersService } from "./users.service.js";

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  list(options?: ListUsersOptions) {
    return this.usersService.listUsers(options);
  }

  get(userId: string) {
    return this.usersService.getUser(userId);
  }

  update(actor: AuthenticatedUser, userId: string, body: UpdateUserPatch) {
    return this.usersService.updateUser(actor, userId, body);
  }

  deactivate(actor: AuthenticatedUser, userId: string) {
    return this.usersService.deactivateUser(actor, userId);
  }

  activate(userId: string) {
    return this.usersService.activateUser(userId);
  }
}
