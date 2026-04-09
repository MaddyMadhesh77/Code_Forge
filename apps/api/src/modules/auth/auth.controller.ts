import { AuthService } from "./auth.service.js";

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}

  register(body: unknown) {
    return this.authService.register(body);
  }

  login(body: unknown) {
    return this.authService.login(body);
  }

  refresh(refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  revoke(refreshToken: string) {
    return this.authService.revoke(refreshToken);
  }

  me(userId: string) {
    return this.authService.me(userId);
  }
}
