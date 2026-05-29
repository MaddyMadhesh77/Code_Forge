import type { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

export class UsersController {
  constructor(private readonly usersService = new UsersService()) {}

  list() {
    return this.usersService.listUsers();
  }

  get(userId: string) {
    return this.usersService.getUser(userId);
  }

  update(userId: string, body: UpdateUserDto) {
    return this.usersService.updateUser(userId, body);
  }

  deactivate(userId: string) {
    return this.usersService.deactivateUser(userId);
  }

  activate(userId: string) {
    return this.usersService.activateUser(userId);
  }
}

