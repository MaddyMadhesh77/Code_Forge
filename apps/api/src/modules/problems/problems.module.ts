import { ProblemsController } from "./problems.controller.js";
import { ProblemsService } from "./problems.service.js";

export class ProblemsModule {
	controller = new ProblemsController(new ProblemsService());
	service = new ProblemsService();
}
