import type { UpdateUserPatch, UsersRepository } from "./users.repository.js";
import { InMemoryUsersRepository } from "./users.store.js";

export class UsersService {
  constructor(private readonly repository: UsersRepository = new InMemoryUsersRepository()) {}

  listUsers() {
    return this.repository.list();
  }

  getUser(userId: string) {
    return this.repository.getById(userId);
  }

  updateUser(userId: string, patch: UpdateUserPatch) {
    return this.repository.update(userId, patch);
  }

  deactivateUser(userId: string) {
    return this.repository.setActive(userId, false);
  }

  activateUser(userId: string) {
    return this.repository.setActive(userId, true);
  }
}
