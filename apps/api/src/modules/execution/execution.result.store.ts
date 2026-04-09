import type { ExecutionResult } from "../../../../../packages/shared/src/schemas/execution.schema.js";

export class ExecutionResultStore {
  private readonly resultsBySubmission = new Map<string, ExecutionResult>();
  private readonly submissionSession = new Map<string, string>();

  saveResult(result: ExecutionResult) {
    this.resultsBySubmission.set(result.submissionId, result);
    return result;
  }

  getResult(submissionId: string) {
    return this.resultsBySubmission.get(submissionId) ?? null;
  }

  listResults() {
    return Array.from(this.resultsBySubmission.values());
  }

  setSubmissionSession(submissionId: string, sessionId: string | undefined) {
    if (!sessionId) {
      return;
    }

    this.submissionSession.set(submissionId, sessionId);
  }

  getSubmissionSession(submissionId: string) {
    return this.submissionSession.get(submissionId) ?? null;
  }
}
