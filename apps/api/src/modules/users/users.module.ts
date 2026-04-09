import { UsersController } from "./users.controller.js";
import { PrismaUsersRepository } from "./users.prisma.repository.js";
import { UsersService } from "./users.service.js";
import { PrismaService } from "../../database/prisma.service.js";

export class UsersModule {
  private readonly repository: PrismaUsersRepository;
  service: UsersService;
  controller: UsersController;

  constructor(prismaService: PrismaService) {
    this.repository = new PrismaUsersRepository(prismaService);
    this.service = new UsersService(this.repository);
    this.controller = new UsersController(this.service);
  }
}
