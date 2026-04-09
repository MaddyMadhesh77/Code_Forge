import { WorkerModule } from "../../../../sandbox-worker/src/worker.module.js";
import { ExecutionController } from "./execution.controller.js";
import { ExecutionModule } from "./execution.module.js";

export function verifyExecutionFlow() {
  const executionModule = new ExecutionModule();
  const controller: ExecutionController = executionModule.controller;
  const worker = new WorkerModule();

  const queued = controller.submitCode({
    problemId: "33333333-3333-3333-3333-333333333333",
    sessionId: "session_demo",
    language: "python",
    code: "print('ok')",
    timeoutMs: 5000,
    memoryLimitMb: 128,
  });

  worker.drainOnce();
  const sync = executionModule.syncService.runOnce();
  const result = controller.result(queued.submissionId);
  const roomEvents = executionModule.collaborationService.listExecutionEvents("session_demo");

  if (!result || sync.syncedCount < 1 || roomEvents.length < 1) {
    throw new Error("EXECUTION_FLOW_VERIFICATION_FAILED");
  }

  return {
    queued,
    sync,
    result,
    roomEvents,
  };
}
