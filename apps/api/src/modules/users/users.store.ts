import type { UserRecord, UsersRepository } from "./users.repository.js";

const users: UserRecord[] = [
  {
    id: "user_1",
    email: "candidate@codeforge.dev",
    displayName: "Candidate",
    role: "CANDIDATE",
    avatarUrl: null,
    isActive: true,
  },
  {
    id: "user_2",
    email: "interviewer@codeforge.dev",
    displayName: "Interviewer",
    role: "INTERVIEWER",
    avatarUrl: null,
    isActive: true,
  },
];

export class InMemoryUsersRepository implements UsersRepository {
  list() {
    return [...users];
  }

  getById(id: string) {
    return users.find((user) => user.id === id);
  }

  update(id: string, patch: { displayName?: string; avatarUrl?: string | null }) {
    const user = this.getById(id);

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    if (typeof patch.displayName === "string") {
      user.displayName = patch.displayName;
    }

    if (patch.avatarUrl !== undefined) {
      user.avatarUrl = patch.avatarUrl;
    }

    return user;
  }

  setActive(id: string, isActive: boolean) {
    const user = this.getById(id);

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    user.isActive = isActive;
    return user;
  }
}
