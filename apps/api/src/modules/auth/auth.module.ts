import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { RefreshTokenRepository } from "./refresh-token.repository.js";
import type { UsersRepository } from "../users/users.repository.js";
import { getConfig, type AppConfig } from "../../config/env.js";
import { PrismaService } from "../../database/prisma.service.js";

export class AuthModule {
  readonly refreshTokens: RefreshTokenRepository;
  readonly service: AuthService;
  readonly controller: AuthController;

  constructor(prisma: PrismaService, users: UsersRepository, config: AppConfig = getConfig()) {
    this.refreshTokens = new RefreshTokenRepository(prisma);
    this.service = new AuthService(users, this.refreshTokens, config);
    this.controller = new AuthController(this.service);
  }
}
