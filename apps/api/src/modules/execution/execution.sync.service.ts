import { ExecutionService } from "./execution.service.js";
import { CollaborationService } from "../collaboration/collaboration.service.js";

export class ExecutionSyncService {
  constructor(
    private readonly executionService: ExecutionService,
    private readonly collaborationService: CollaborationService,
  ) {}

  runOnce() {
    const synced = this.executionService.ingestWorkerResults();

    for (const event of synced) {
      const sessionId = this.executionService.getSubmissionSession(event.result.submissionId);

      if (sessionId) {
        this.collaborationService.publishExecutionResult(sessionId, event.result);
      }
    }

    return {
      syncedCount: synced.length,
      syncedSubmissionIds: synced.map((event) => event.result.submissionId),
      totalResults: this.executionService.listResults().length,
    };
  }
}
