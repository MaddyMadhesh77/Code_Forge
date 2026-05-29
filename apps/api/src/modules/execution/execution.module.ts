import { ExecutionController } from "./execution.controller.js";
import { BullMqExecutionQueue } from "./execution.queue.js";
import { CollaborationService } from "../collaboration/collaboration.service.js";
import { ExecutionService } from "./execution.service.js";
import { ExecutionSyncService } from "./execution.sync.service.js";
import { ResourceCaps } from "../../services/resource-caps.service.js";

export class ExecutionModule {
	private readonly queue = new BullMqExecutionQueue();
	readonly collaborationService: CollaborationService;
	service = new ExecutionService(this.queue);
	syncService: ExecutionSyncService;
	controller = new ExecutionController(this.service);
	resourceCaps = new ResourceCaps(
		Number(process.env.EXEC_CPU_TIME_MS) || 5000,
		Number(process.env.EXEC_MEMORY_MB) || 128,
		Number(process.env.EXEC_DISK_MB) || 50,
		Number(process.env.EXEC_PROCESSES_MAX) || 10,
		Number(process.env.EXEC_FDS_MAX) || 256,
	);

	constructor(collaborationService = new CollaborationService()) {
		this.collaborationService = collaborationService;
		this.syncService = new ExecutionSyncService(this.service, this.collaborationService);
	}
}

