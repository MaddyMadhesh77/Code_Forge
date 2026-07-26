import { AuthModule } from "./modules/auth/auth.module.js";
import { CollaborationModule } from "./modules/collaboration/collaboration.module.js";
import { ExecutionModule } from "./modules/execution/execution.module.js";
import { InterviewsModule } from "./modules/interviews/interviews.module.js";
import { MetricsModule } from "./modules/metrics/metrics.module.js";
import { ProblemsModule } from "./modules/problems/problems.module.js";
import { QueueModule } from "./modules/queue/queue.module.js";
import { SessionsModule } from "./modules/sessions/sessions.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { ComplexityAnalysisService } from "./modules/interviews/complexity-analysis.service.js";
import { StaticReviewService } from "./modules/interviews/ai-review.service.js";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard.js";
import { RolesGuard } from "./common/guards/roles.guard.js";
import { WsAuthGuard } from "./common/guards/ws-auth.guard.js";
import { AuditMiddleware } from "./common/middleware/audit.middleware.js";
import { IntervalJob } from "./common/scheduler/interval-job.js";
import { logger } from "./common/logging/logger.js";
import { getConfig, type AppConfig } from "./config/env.js";
import { AuditForwarder } from "./services/audit-forwarder.service.js";
import { AuditReader } from "./services/audit-reader.service.js";
import { OIDCClient, SCIMProvider } from "./services/enterprise-auth.service.js";
import { PublicAPIService } from "./services/public-api.service.js";
import { RetentionService } from "./services/retention.service.js";

const log = logger.child("AppModule");

/**
 * Composition root.
 *
 * Every dependency is constructed once here and injected downward. The
 * previous version had modules new-ing up their own collaborators — including
 * duplicate service instances for the same module — which made state
 * ownership ambiguous and the graph impossible to test.
 */
export class AppModule {
  readonly config: AppConfig;
  readonly database: DatabaseModule;

  readonly users: UsersModule;
  readonly auth: AuthModule;
  readonly problems: ProblemsModule;
  readonly sessions: SessionsModule;
  readonly collaboration: CollaborationModule;
  readonly execution: ExecutionModule;
  readonly interviews: InterviewsModule;
  readonly metrics: MetricsModule;
  readonly queue: QueueModule | null;

  readonly guards: { jwt: JwtAuthGuard; roles: RolesGuard; ws: WsAuthGuard };
  readonly analysis: { complexity: ComplexityAnalysisService; review: StaticReviewService };

  readonly auditForwarder: AuditForwarder;
  readonly auditReader: AuditReader;
  readonly audit: AuditMiddleware;
  readonly retention: RetentionService;
  readonly publicAPI: PublicAPIService;
  readonly oidc: OIDCClient;
  readonly scim: SCIMProvider;

  private readonly jobs: IntervalJob[] = [];
  private readonly disposables: Array<() => void | Promise<void>> = [];

  constructor(config: AppConfig = getConfig()) {
    this.config = config;
    this.database = new DatabaseModule(config);

    const prisma = this.database.prisma;

    this.users = new UsersModule(prisma);
    this.auth = new AuthModule(prisma, this.users.repository, config);
    this.problems = new ProblemsModule(prisma);
    this.sessions = new SessionsModule(prisma);
    this.collaboration = new CollaborationModule();
    this.execution = new ExecutionModule({
      prisma,
      problems: this.problems.repository,
      sessions: this.sessions.repository,
      collaborationService: this.collaboration.service,
    });
    this.interviews = new InterviewsModule(prisma);
    this.metrics = new MetricsModule();

    // Redis is optional in development; a missing broker degrades the operator
    // queue views rather than preventing the API from starting.
    this.queue = QueueModule.createIfConfigured(config);

    const complexity = new ComplexityAnalysisService();
    this.analysis = { complexity, review: new StaticReviewService(complexity) };

    this.guards = {
      jwt: new JwtAuthGuard(config),
      roles: new RolesGuard(),
      ws: new WsAuthGuard(config),
    };

    this.auditForwarder = new AuditForwarder(config.audit.dir);
    this.auditReader = new AuditReader(config.audit.dir);
    this.audit = new AuditMiddleware(this.auditForwarder);
    this.retention = new RetentionService(config.audit.retentionDays, config.audit.dir);
    this.publicAPI = new PublicAPIService(prisma);
    this.oidc = OIDCClient.fromAppConfig(config);
    this.scim = new SCIMProvider(prisma);
  }

  /** Opens the database connection and starts background jobs. */
  async init(): Promise<void> {
    await this.database.prisma.connect();

    // Anything still RUNNING belongs to a process that died; fail it now so
    // clients stop polling.
    const stale = await this.execution.runService.reconcileStaleRuns();

    if (stale > 0) {
      log.warn("Reconciled stale execution runs from a previous process", { count: stale });
    }

    this.jobs.push(
      new IntervalJob({
        name: "audit-retention",
        intervalMs: 24 * 60 * 60 * 1000,
        task: () => this.retention.enforce(),
      }).start(),
      new IntervalJob({
        name: "execution-result-sync",
        intervalMs: 2_000,
        task: () => this.execution.runService.ingestResults(),
      }).start(),
      new IntervalJob({
        name: "refresh-token-cleanup",
        intervalMs: 60 * 60 * 1000,
        task: () => this.auth.refreshTokens.deleteExpired(),
      }).start(),
    );
  }

  /** Registers a cleanup callback to run during shutdown. */
  registerDisposable(dispose: () => void | Promise<void>): void {
    this.disposables.push(dispose);
  }

  /**
   * Releases every resource this module owns. Called on SIGTERM so in-flight
   * work finishes and the process can exit rather than being killed.
   */
  async shutdown(): Promise<void> {
    for (const job of this.jobs) {
      job.stop();
    }

    // `allSettled`: one failing disposable must not skip the rest.
    await Promise.allSettled(this.disposables.map((dispose) => dispose()));
    await this.auditForwarder.flush();
    await this.interviews.pdfExport.close();

    if (this.queue) {
      await this.queue.close();
    }

    await this.database.prisma.disconnect();
    log.info("Shutdown complete");
  }
}
