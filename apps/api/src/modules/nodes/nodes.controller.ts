import type { Session } from "@cascade/auth/server";
import { Controller, Get } from "@nestjs/common";
import {
	ApiCookieAuth,
	ApiOperation,
	ApiResponse,
	ApiTags,
	ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { VisibleTreeResponseDTO } from "./dto/node.dto";
import { VisibleTreeService } from "./services/tree.service";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";

@ApiTags("nodes")
@ApiCookieAuth("session")
@Controller("nodes")
export class NodesController {
	constructor(private readonly visibleTreeService: VisibleTreeService) {}

	@Get()
	@ApiOperation({
		summary:
			"Every node belonging to the current user, flat and unordered; the client builds the tree from parentId",
	})
	@ApiResponse({ status: 200, type: VisibleTreeResponseDTO })
	@ApiUnauthorizedResponse({ description: "Valid user session required" })
	async list(
		@CurrentUser() currentUser: Session["user"],
	): Promise<VisibleTreeResponseDTO> {
		return this.visibleTreeService.get(currentUser.id);
	}
}
