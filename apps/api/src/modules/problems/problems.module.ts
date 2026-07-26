import { ProblemsRepository } from "./problems.repository.js";
import { ProblemsService } from "./problems.service.js";
import { PrismaService } from "../../database/prisma.service.js";

export class ProblemsModule {
  readonly repository: ProblemsRepository;
  readonly service: ProblemsService;

  constructor(prisma: PrismaService) {
    this.repository = new ProblemsRepository(prisma);
    this.service = new ProblemsService(this.repository);
  }
}
