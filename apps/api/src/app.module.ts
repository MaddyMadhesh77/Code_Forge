import { AuthModule } from "./modules/auth/auth.module.js";
import { ExecutionModule } from "./modules/execution/execution.module.js";
import { ProblemsModule } from "./modules/problems/problems.module.js";
import { CollaborationModule } from "./modules/collaboration/collaboration.module.js";
import { SessionsModule } from "./modules/sessions/sessions.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { DatabaseModule } from "./database/database.module.js";

export class AppModule {
	database = new DatabaseModule();
	collaboration = new CollaborationModule();
	auth = new AuthModule();
	execution = new ExecutionModule(this.collaboration.service);
	problems = new ProblemsModule();
	sessions = new SessionsModule();
	users = new UsersModule(this.database.prisma);
}
