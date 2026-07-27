import { SessionsRepository } from "./sessions.repository.js";
import { SessionsService } from "./sessions.service.js";
import { PrismaService } from "../../database/prisma.service.js";

export class SessionsModule {
  readonly repository: SessionsRepository;
  readonly service: SessionsService;

  constructor(prisma: PrismaService) {
    this.repository = new SessionsRepository(prisma);
    this.service = new SessionsService(this.repository);
  }
}
