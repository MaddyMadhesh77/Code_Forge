import { ExecutionController } from "./execution.controller.js";
import { ExecutionRunRepository } from "./execution-run.repository.js";
import { ExecutionRunService } from "./execution-run.service.js";
import { BullMqExecutionQueue } from "./execution.queue.js";
import { ExecutionService } from "./execution.service.js";
import { ExecutionSyncService } from "./execution.sync.service.js";
import { CollaborationService } from "../collaboration/collaboration.service.js";
import type { ProblemsRepository } from "../problems/problems.repository.js";
import type { SessionsRepository } from "../sessions/sessions.repository.js";
import { PrismaService } from "../../database/prisma.service.js";
import { ResourceCaps } from "../../services/resource-caps.service.js";

export type ExecutionModuleDeps = {
  prisma: PrismaService;
  problems: ProblemsRepository;
  sessions: SessionsRepository;
  collaborationService?: CollaborationService;
};

export class ExecutionModule {
  readonly collaborationService: CollaborationService;
  readonly service: ExecutionService;
  readonly syncService: ExecutionSyncService;
  readonly controller: ExecutionController;
  readonly runs: ExecutionRunRepository;
  readonly runService: ExecutionRunService;
  readonly resourceCaps: ResourceCaps;

  constructor(deps: ExecutionModuleDeps) {
    this.collaborationService = deps.collaborationService ?? new CollaborationService();
    this.service = new ExecutionService(new BullMqExecutionQueue());
    this.syncService = new ExecutionSyncService(this.service, this.collaborationService);
    this.controller = new ExecutionController(this.service);
    this.runs = new ExecutionRunRepository(deps.prisma);
    this.runService = new ExecutionRunService(
      this.runs,
      this.service,
      deps.problems,
      deps.sessions,
    );

    this.resourceCaps = new ResourceCaps({
      cpuTimeMs: Number(process.env.EXEC_CPU_TIME_MS) || 5_000,
      memoryMb: Number(process.env.EXEC_MEMORY_MB) || 128,
      diskMb: Number(process.env.EXEC_DISK_MB) || 50,
      processesMax: Number(process.env.EXEC_PROCESSES_MAX) || 10,
      fileDescriptorsMax: Number(process.env.EXEC_FDS_MAX) || 256,
    });
  }
}
