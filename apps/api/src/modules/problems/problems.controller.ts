import { ProblemsService } from "./problems.service.js";

export class ProblemsController {
	constructor(private readonly problemsService = new ProblemsService()) {}

	listPublished() {
		return this.problemsService.listPublished();
	}

	getBySlug(slug: string) {
		return this.problemsService.getPublicBySlug(slug);
	}
}
