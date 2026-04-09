import { PrismaService } from "./prisma.service.js";

export class DatabaseModule {
	prisma = new PrismaService();

	health() {
		return this.prisma.status();
	}
}
