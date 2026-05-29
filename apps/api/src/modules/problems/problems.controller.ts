import { ProblemsService } from "./problems.service.js";

export class ProblemsController {
	constructor(private readonly problemsService = new ProblemsService()) {}

	listPublished() {
		return this.problemsService.listPublished();
	}

	getBySlug(slug: string) {
		return this.problemsService.getPublicBySlug(slug);
	}

	listCustom(teamId?: string, ownerId?: string) {
		return this.problemsService.listCustomProblems(teamId, ownerId);
	}

	createCustom(body: {
		ownerId: string;
		teamId?: string;
		title: string;
		description: string;
		difficulty: "EASY" | "MEDIUM" | "HARD";
		constraints?: string | null;
		starterCode?: Record<string, string>;
		supportedLangs?: Array<"python" | "javascript" | "cpp" | "java">;
		visibility?: "PRIVATE" | "TEAM" | "PUBLIC";
	}) {
		return this.problemsService.createCustomProblem(body);
	}

	getCustom(problemId: string) {
		return this.problemsService.getCustomProblem(problemId);
	}

	addPrivateTestCase(problemId: string, body: { input: string; expected: string; isHidden?: boolean }) {
		return this.problemsService.addPrivateTestCase(problemId, body);
	}

	listPrivateTestCases(problemId: string) {
		return this.problemsService.listPrivateTestCases(problemId);
	}

	shareWithTeam(problemId: string, teamId: string) {
		return this.problemsService.shareProblemWithTeam(problemId, teamId);
	}
}

