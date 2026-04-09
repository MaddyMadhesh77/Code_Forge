import { ExecutionService } from "./execution.service.js";

export class ExecutionController {
	constructor(private readonly executionService = new ExecutionService()) {}

	submitCode(body: unknown) {
		return this.executionService.enqueue(body);
	}

	listQueued() {
		return this.executionService.listQueued();
	}

	queueStatus() {
		return {
			backend: this.executionService.queueBackend(),
			queuedJobs: this.executionService.listQueued().length,
		};
	}

	pullNextJob() {
		return this.executionService.pullNextJob();
	}

	syncResults() {
		return this.executionService.ingestWorkerResults();
	}

	result(submissionId: string) {
		return this.executionService.getResult(submissionId);
	}

	results() {
		return this.executionService.listResults();
	}

	syncSummary() {
		const synced = this.executionService.ingestWorkerResults();

		return {
			syncedCount: synced.length,
			totalResults: this.executionService.listResults().length,
		};
	}
}
