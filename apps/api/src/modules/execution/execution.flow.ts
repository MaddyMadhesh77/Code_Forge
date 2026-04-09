import type { SubmitCodeInput } from "../../../../../packages/shared/src/schemas/execution.schema.js";
import { WorkerModule } from "../../../../sandbox-worker/src/worker.module.js";
import { ExecutionController } from "./execution.controller.js";

export function runExecutionFlow(controller: ExecutionController, worker: WorkerModule, input: SubmitCodeInput) {
  const queued = controller.submitCode(input);
  const workerResult = worker.drainOnce();
  const synced = controller.syncResults();
  const result = controller.result(queued.submissionId);

  return {
    queued,
    workerResult,
    synced,
    result,
  };
}
