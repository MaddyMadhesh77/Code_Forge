import { CollaborationGateway } from "./collaboration.gateway.js";
import { CollaborationService } from "./collaboration.service.js";
import { PresenceService } from "./presence.service.js";

export class CollaborationModule {
	service = new CollaborationService();
	gateway = new CollaborationGateway(this.service);
	presence = new PresenceService();
}
