import { SessionsController } from "./sessions.controller.js";
import { SessionsService } from "./sessions.service.js";

export class SessionsModule {
  controller = new SessionsController(new SessionsService());
  service = new SessionsService();
}
