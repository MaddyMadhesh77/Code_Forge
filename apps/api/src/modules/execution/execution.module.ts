import { ExecutionController } from "./execution.controller.js";
import { BullMqExecutionQueue } from "./execution.queue.js";
import { CollaborationService } from "../collaboration/collaboration.service.js";
import { ExecutionService } from "./execution.service.js";
import { ExecutionSyncService } from "./execution.sync.service.js";

export class ExecutionModule {
	private readonly queue = new BullMqExecutionQueue();
	readonly collaborationService: CollaborationService;
	service = new ExecutionService(this.queue);
	syncService: ExecutionSyncService;
	controller = new ExecutionController(this.service);

	constructor(collaborationService = new CollaborationService()) {
		this.collaborationService = collaborationService;
		this.syncService = new ExecutionSyncService(this.service, this.collaborationService);
	}
}
