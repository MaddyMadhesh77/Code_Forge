import { AppModule } from "./app.module.js";
import { runExecutionFlow } from "./modules/execution/execution.flow.js";
import { WorkerModule } from "../../sandbox-worker/src/worker.module.js";

export function bootstrapApi() {
  const appModule = new AppModule();
  const workerModule = new WorkerModule();

  const demoExecutionFlow = runExecutionFlow(appModule.execution.controller, workerModule, {
    problemId: "33333333-3333-3333-3333-333333333333",
    sessionId: "session_demo",
    language: "python",
    code: "print('hello')",
    timeoutMs: 5000,
    memoryLimitMb: 128,
  });

  return {
    appName: "codeforge-api",
    ports: [4000],
    features: ["rest", "websocket", "validation", "auth"],
    modules: appModule,
    demoExecutionFlow,
  };
}
