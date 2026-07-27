import { AuthService } from "./auth.service.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register(body: unknown) {
    return this.authService.register(body);
  }

  login(body: unknown) {
    return this.authService.login(body);
  }

  refresh(refreshToken: unknown) {
    return this.authService.refresh(refreshToken);
  }

  revoke(refreshToken: unknown) {
    return this.authService.revoke(refreshToken);
  }

  me(userId: string) {
    return this.authService.me(userId);
  }
}
