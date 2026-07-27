import type { UploadRecordingArtifactDto } from "../dto/index.js";
import { PdfExportService } from "../pdf-export.service.js";
import { RecordingService } from "../recording.service.js";
import { ReportService } from "../report.service.js";
import type { AuthenticatedUser } from "../../../common/guards/jwt-auth.guard.js";

/**
 * Recordings, reports, share links and export.
 */
export class InterviewMediaController {
  constructor(
    private readonly recordings: RecordingService,
    private readonly reports: ReportService,
    private readonly pdfExport: PdfExportService,
  ) {}

  getRecording(sessionId: string) {
    return this.recordings.getRecording(sessionId);
  }

  uploadRecordingArtifact(sessionId: string, data: UploadRecordingArtifactDto) {
    return this.recordings.saveRecordingArtifact(sessionId, data);
  }

  listRecordingArtifacts(sessionId: string) {
    return this.recordings.getRecordingArtifacts(sessionId);
  }

  createReport(sessionId: string) {
    return this.reports.createReport(sessionId);
  }

  getReport(sessionId: string) {
    return this.reports.getReportBySessionId(sessionId);
  }

  extendShareLink(sessionId: string, expiryDays?: number) {
    return this.reports.extendShareLink(sessionId, expiryDays);
  }

  revokeShareLink(sessionId: string) {
    return this.reports.revokeShareLink(sessionId);
  }

  getPublicReport(token: string) {
    return this.reports.getReportByShareToken(token);
  }

  /**
   * Exports a session as JSON, or renders it to PDF through the pooled
   * browser. PDF bytes are base64-encoded so the payload stays JSON.
   */
  async exportInterview(
    sessionId: string,
    body: { format: "PDF" | "JSON"; includeRecording?: boolean },
  ) {
    const exportData = await this.reports.generateExportData(
      sessionId,
      body.format,
      body.includeRecording,
    );

    if (body.format === "PDF" && typeof exportData === "string") {
      const pdf = await this.pdfExport.renderHtmlToPdfBuffer(exportData);

      return {
        contentType: "application/pdf",
        fileName: `interview-${sessionId}.pdf`,
        data: Buffer.from(pdf).toString("base64"),
      };
    }

    return exportData;
  }
}
