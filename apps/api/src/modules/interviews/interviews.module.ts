import { InterviewsController } from './interviews.controller.js';
import { InterviewsService } from './interviews.service.js';
import { InterviewsGateway } from './interviews.gateway.js';
import { RecordingService } from './recording.service.js';
import { ScorecardService } from './scorecard.service.js';
import { AntiCheatService } from './anti-cheat.service.js';
import { ReportService } from './report.service.js';
import { PdfExportService } from './pdf-export.service.js';
import { EmailNotificationService } from './email-notification.service.js';
import { ComplexityAnalysisService } from './complexity-analysis.service.js';
import { AiReviewService } from './ai-review.service.js';
import { AnalyticsService } from './analytics.service.js';
import { InterviewProductService } from './interview-product.service.js';
import { PrismaService } from '../../database/prisma.service.js';

export class InterviewsModule {
  service: InterviewsService;
  gateway: InterviewsGateway;
  controller: InterviewsController;

  private recordingService: RecordingService;
  private scorecardService: ScorecardService;
  private antiCheatService: AntiCheatService;
  private reportService: ReportService;
  private pdfExportService: PdfExportService;
  private emailNotificationService: EmailNotificationService;
  private complexityAnalysisService: ComplexityAnalysisService;
  private aiReviewService: AiReviewService;
  private analyticsService: AnalyticsService;
  private interviewProductService: InterviewProductService;

  constructor(prismaService: PrismaService) {
    this.recordingService = new RecordingService(prismaService);
    this.scorecardService = new ScorecardService(prismaService);
    this.antiCheatService = new AntiCheatService(prismaService);
    this.reportService = new ReportService(prismaService);
    this.pdfExportService = new PdfExportService();
    this.emailNotificationService = new EmailNotificationService();
    this.complexityAnalysisService = new ComplexityAnalysisService();
    this.aiReviewService = new AiReviewService(this.complexityAnalysisService);
    this.analyticsService = new AnalyticsService(prismaService);
    this.service = new InterviewsService(prismaService);
    this.interviewProductService = new InterviewProductService(
      this.scorecardService,
      this.recordingService,
      this.antiCheatService,
    );
    this.gateway = new InterviewsGateway(
      this.recordingService,
      this.antiCheatService,
      this.interviewProductService,
    );
    this.controller = new InterviewsController(
      this.service,
      this.recordingService,
      this.scorecardService,
      this.antiCheatService,
      this.reportService,
      this.pdfExportService,
      this.emailNotificationService,
      this.complexityAnalysisService,
      this.aiReviewService,
      this.analyticsService,
      this.interviewProductService,
    );
  }
}

