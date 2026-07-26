import { UsersController } from "./users.controller.js";
import { PrismaUsersRepository } from "./users.prisma.repository.js";
import type { UsersRepository } from "./users.repository.js";
import { UsersService } from "./users.service.js";
import { PrismaService } from "../../database/prisma.service.js";

export class UsersModule {
  readonly repository: UsersRepository;
  readonly service: UsersService;
  readonly controller: UsersController;

  constructor(prisma: PrismaService) {
    this.repository = new PrismaUsersRepository(prisma);
    this.service = new UsersService(this.repository);
    // One service instance shared with the controller — the previous wiring
    // constructed a second one, so the two could diverge.
    this.controller = new UsersController(this.service);
  }
}
