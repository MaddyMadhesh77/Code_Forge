import { StaticReviewService } from "./ai-review.service.js";
import { AnalyticsService } from "./analytics.service.js";
import { AntiCheatService } from "./anti-cheat.service.js";
import { ComplexityAnalysisService } from "./complexity-analysis.service.js";
import { EmailNotificationService } from "./email-notification.service.js";
import { InterviewProductService } from "./interview-product.service.js";
import { InterviewsGateway } from "./interviews.gateway.js";
import { InterviewsRepository } from "./interviews.repository.js";
import { InterviewsService } from "./interviews.service.js";
import { PdfExportService } from "./pdf-export.service.js";
import { RecordingService } from "./recording.service.js";
import { ReportService } from "./report.service.js";
import { ScorecardService } from "./scorecard.service.js";
import { InterviewAnalysisController } from "./controllers/interview-analysis.controller.js";
import { InterviewAssessmentController } from "./controllers/interview-assessment.controller.js";
import { InterviewLifecycleController } from "./controllers/interview-lifecycle.controller.js";
import { InterviewMediaController } from "./controllers/interview-media.controller.js";
import { InterviewProductController } from "./controllers/interview-product.controller.js";
import { PrismaService } from "../../database/prisma.service.js";

/**
 * Wires the interview feature.
 *
 * The single `InterviewsController` (34 methods, 11 constructor dependencies)
 * has been replaced by five controllers grouped by responsibility — lifecycle,
 * assessment, media, analysis and the commercial product surface. Each takes
 * only the services it uses.
 */
export class InterviewsModule {
  readonly repository: InterviewsRepository;
  readonly service: InterviewsService;
  readonly gateway: InterviewsGateway;

  readonly recording: RecordingService;
  readonly scorecards: ScorecardService;
  readonly antiCheat: AntiCheatService;
  readonly reports: ReportService;
  readonly pdfExport: PdfExportService;
  readonly email: EmailNotificationService;
  readonly complexity: ComplexityAnalysisService;
  readonly review: StaticReviewService;
  readonly analytics: AnalyticsService;
  readonly products: InterviewProductService;

  readonly controllers: {
    lifecycle: InterviewLifecycleController;
    assessment: InterviewAssessmentController;
    media: InterviewMediaController;
    analysis: InterviewAnalysisController;
    product: InterviewProductController;
  };

  constructor(prisma: PrismaService) {
    this.repository = new InterviewsRepository(prisma);
    this.service = new InterviewsService(prisma);

    this.recording = new RecordingService(prisma);
    this.scorecards = new ScorecardService(prisma);
    this.antiCheat = new AntiCheatService(prisma);
    this.reports = new ReportService(prisma);
    this.pdfExport = new PdfExportService();
    this.email = new EmailNotificationService();
    this.complexity = new ComplexityAnalysisService();
    this.review = new StaticReviewService(this.complexity);
    this.analytics = new AnalyticsService(prisma);

    this.products = new InterviewProductService(
      this.scorecards,
      this.recording,
      this.antiCheat,
    );

    this.gateway = new InterviewsGateway(this.recording, this.antiCheat, this.products);

    this.controllers = {
      lifecycle: new InterviewLifecycleController(this.service, this.products),
      assessment: new InterviewAssessmentController(
        this.scorecards,
        this.antiCheat,
        this.service,
        this.products,
      ),
      media: new InterviewMediaController(this.recording, this.reports, this.pdfExport),
      analysis: new InterviewAnalysisController(
        this.complexity,
        this.review,
        this.analytics,
        this.email,
      ),
      product: new InterviewProductController(this.products),
    };
  }
}
