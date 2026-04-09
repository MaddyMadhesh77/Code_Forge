import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

export class AuthModule {
  controller = new AuthController(new AuthService());
  service = new AuthService();
}
