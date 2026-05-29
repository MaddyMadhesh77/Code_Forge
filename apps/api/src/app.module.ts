import { AuthModule } from "./modules/auth/auth.module.js";
import { ExecutionModule } from "./modules/execution/execution.module.js";
import { ProblemsModule } from "./modules/problems/problems.module.js";
import { CollaborationModule } from "./modules/collaboration/collaboration.module.js";
import { SessionsModule } from "./modules/sessions/sessions.module.js";
import { UsersModule } from "./modules/users/users.module.js";
// import { InterviewsModule } from "./modules/interviews/interviews.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { MetricsModule } from "./modules/metrics/metrics.module.js";
import { QueueModule } from "./modules/queue/queue.module.js";
import { AuditMiddleware } from "./common/middleware/audit.middleware.js";
import { AuditForwarder } from "./services/audit-forwarder.service.js";
import { RetentionService } from "./services/retention.service.js";
import { PublicAPIService, publicAPIService } from "./services/public-api.service.js";
import { oidcClient, scimProvider } from "./services/enterprise-auth.service.js";

export class AppModule {
	database = new DatabaseModule();
	collaboration = new CollaborationModule();
	auth = new AuthModule();
	execution = new ExecutionModule(this.collaboration.service);
	problems = new ProblemsModule();
	sessions = new SessionsModule();
	users = new UsersModule(this.database.prisma);
	// interviews = new InterviewsModule(this.database.prisma);
	metrics = new MetricsModule();
	queue = new QueueModule();
	auditForwarder = new AuditForwarder();
	retention = new RetentionService(Number(process.env.AUDIT_RETENTION_DAYS) || 90);
	audit = new AuditMiddleware(this.auditForwarder);
	publicAPI = publicAPIService;
	oidc = oidcClient;
	scim = scimProvider;
}
