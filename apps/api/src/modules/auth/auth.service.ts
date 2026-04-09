import {
  loginSchema,
  registerSchema,
  type AuthSession,
  type AuthTokens,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from "../../../../../packages/shared/src/schemas/auth.schema.js";

type StoredUser = AuthUser & { password: string };

type RefreshRecord = {
  token: string;
  userId: string;
  family: string;
  revoked: boolean;
};

const users: StoredUser[] = [];
const refreshTokens: RefreshRecord[] = [];

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function makeToken(prefix: string) {
  return `${prefix}.${Math.random().toString(36).slice(2)}.${Date.now()}`;
}

function buildTokens(userId: string, family: string): AuthTokens {
  const accessToken = makeToken(`access.${userId}`);
  const refreshToken = makeToken(`refresh.${family}`);

  refreshTokens.push({ token: refreshToken, userId, family, revoked: false });

  return {
    accessToken,
    refreshToken,
    expiresInSeconds: 900,
  };
}

export class AuthService {
  register(input: unknown): AuthSession {
    const payload = registerSchema.parse(input) satisfies RegisterInput;
    const existingUser = users.find((user) => user.email === payload.email);

    if (existingUser) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const user: StoredUser = {
      id: makeId("user"),
      email: payload.email,
      displayName: payload.displayName,
      role: "CANDIDATE",
      password: `hashed:${payload.password}`,
    };

    users.push(user);

    return {
      user,
      tokens: buildTokens(user.id, makeId("family")),
    };
  }

  login(input: unknown): AuthSession {
    const payload = loginSchema.parse(input) satisfies LoginInput;
    const user = users.find((item) => item.email === payload.email);

    if (!user || user.password !== `hashed:${payload.password}`) {
      throw new Error("INVALID_CREDENTIALS");
    }

    return {
      user,
      tokens: buildTokens(user.id, makeId("family")),
    };
  }

  refresh(refreshToken: string): AuthTokens {
    const record = refreshTokens.find((item) => item.token === refreshToken);

    if (!record || record.revoked) {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    const user = users.find((item) => item.id === record.userId);

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    for (const token of refreshTokens) {
      if (token.family === record.family) {
        token.revoked = true;
      }
    }

    return buildTokens(user.id, makeId("family"));
  }

  revoke(refreshToken: string): boolean {
    const record = refreshTokens.find((item) => item.token === refreshToken);

    if (!record) {
      return false;
    }

    record.revoked = true;
    return true;
  }

  me(userId: string): AuthUser | undefined {
    const user = users.find((item) => item.id === userId);

    if (!user) {
      return undefined;
    }

    const { password, ...rest } = user;
    return rest;
  }
}
