import { CollaborationEventStore } from "./collaboration.event.store.js";

export function verifyCollaborationEventStore() {
  const store = new CollaborationEventStore();

  const first = store.publishExecutionResult("session_demo", {
    submissionId: "submission_a",
    verdict: "ACCEPTED",
    runtimeMs: 5,
    memoryKb: 256,
    stdout: "ok",
    stderr: "",
  });

  const second = store.publishExecutionResult("session_demo", {
    submissionId: "submission_b",
    verdict: "WRONG_ANSWER",
    runtimeMs: 7,
    memoryKb: 512,
    stdout: "",
    stderr: "",
  });

  const otherSession = store.publishExecutionResult("session_other", {
    submissionId: "submission_c",
    verdict: "ACCEPTED",
    runtimeMs: 4,
    memoryKb: 128,
    stdout: "ok",
    stderr: "",
  });

  const sessionDemoEvents = store.listExecutionEvents("session_demo");
  const sessionOtherEvents = store.listExecutionEvents("session_other");

  if (sessionDemoEvents.length !== 2 || sessionOtherEvents.length !== 1) {
    throw new Error("COLLABORATION_EVENT_STORE_VERIFICATION_FAILED");
  }

  return {
    first,
    second,
    otherSession,
    sessionDemoEvents,
    sessionOtherEvents,
  };
}
