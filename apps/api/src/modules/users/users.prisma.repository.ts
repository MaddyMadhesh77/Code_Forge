import type { UpdateUserPatch, UserRecord, UsersRepository } from "./users.repository.js";
import { PrismaService } from "../../database/prisma.service.js";

export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): UserRecord[] {
    return this.prisma.userFindMany();
  }

  getById(id: string): UserRecord | undefined {
    return this.prisma.userFindUnique(id);
  }

  update(id: string, patch: UpdateUserPatch): UserRecord {
    return this.prisma.userUpdate(id, patch);
  }

  setActive(id: string, isActive: boolean): UserRecord {
    return this.prisma.userSetActive(id, isActive);
  }
}
