export class PrismaService {
  private connected = false;
  private readonly users = [
    {
      id: "user_1",
      email: "candidate@codeforge.dev",
      displayName: "Candidate",
      role: "CANDIDATE" as const,
      avatarUrl: null as string | null,
      isActive: true,
    },
    {
      id: "user_2",
      email: "interviewer@codeforge.dev",
      displayName: "Interviewer",
      role: "INTERVIEWER" as const,
      avatarUrl: null as string | null,
      isActive: true,
    },
  ];

  connect() {
    this.connected = true;
    return { status: "connected" as const };
  }

  disconnect() {
    this.connected = false;
    return { status: "disconnected" as const };
  }

  status() {
    return {
      connected: this.connected,
      datasource: "postgresql",
      schemaPath: "apps/api/prisma/schema.prisma",
    };
  }

  userFindMany() {
    return [...this.users];
  }

  userFindUnique(id: string) {
    return this.users.find((user) => user.id === id);
  }

  userUpdate(id: string, data: { displayName?: string; avatarUrl?: string | null }) {
    const user = this.userFindUnique(id);

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    if (typeof data.displayName === "string") {
      user.displayName = data.displayName;
    }

    if (data.avatarUrl !== undefined) {
      user.avatarUrl = data.avatarUrl;
    }

    return user;
  }

  userSetActive(id: string, isActive: boolean) {
    const user = this.userFindUnique(id);

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    user.isActive = isActive;
    return user;
  }
}
