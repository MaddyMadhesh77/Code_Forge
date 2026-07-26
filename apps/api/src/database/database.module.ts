import { PrismaService } from "./prisma.service.js";
import { getConfig, type AppConfig } from "../config/env.js";

export class DatabaseModule {
  readonly prisma: PrismaService;

  constructor(config: AppConfig = getConfig()) {
    this.prisma = new PrismaService(config.databaseUrl);
  }

  health() {
    return this.prisma.status();
  }
}
