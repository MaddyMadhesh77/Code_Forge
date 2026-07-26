import type {
  AnalyzeComplexityDto,
  ReviewCodeDto,
  SendInviteEmailDto,
  SendReportEmailDto,
} from "../dto/index.js";
import { StaticReviewService } from "../ai-review.service.js";
import { AnalyticsService } from "../analytics.service.js";
import { ComplexityAnalysisService } from "../complexity-analysis.service.js";
import { EmailNotificationService } from "../email-notification.service.js";

const DEFAULT_DASHBOARD_DAYS = 14;

/**
 * Static code analysis, analytics dashboards and notification email.
 */
export class InterviewAnalysisController {
  constructor(
    private readonly complexity: ComplexityAnalysisService,
    private readonly review: StaticReviewService,
    private readonly analytics: AnalyticsService,
    private readonly email: EmailNotificationService,
  ) {}

  analyzeComplexity(data: AnalyzeComplexityDto) {
    // Language matters: nesting is measured by braces or by indentation.
    return this.complexity.analyze(data.code, data.language ?? "unknown");
  }

  reviewCode(data: ReviewCodeDto) {
    return this.review.reviewCode(data.code, data.language);
  }

  getDashboard(days?: number) {
    const range = Number(days);
    return this.analytics.getInterviewDashboard(
      Number.isFinite(range) && range > 0 ? range : DEFAULT_DASHBOARD_DAYS,
    );
  }

  sendInviteEmail(data: SendInviteEmailDto) {
    return this.email.sendInterviewInvite(data);
  }

  sendReportEmail(data: SendReportEmailDto) {
    return this.email.sendInterviewReportEmail(data.to, data.sessionTitle, data.reportUrl);
  }
}
