import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { type AuthenticatedUser, AuthGuard, GetUser } from "../../auth";
import { VisibleTreeResponseDTO } from "./dto/nodeDTO";
import { VisibleTreeService } from "./services/tree.service";

@ApiTags("nodes")
@ApiBearerAuth()
@Controller("nodes")
@UseGuards(AuthGuard)
export class NodesController {
	constructor(
		@Inject(VisibleTreeService)
		private readonly visibleTreeService: VisibleTreeService,
	) {}

	@Get()
	@ApiOperation({
		summary:
			"Every node belonging to the current user, flat and unordered; the client builds the tree from parentId",
	})
	@ApiResponse({ status: 200, type: VisibleTreeResponseDTO })
	async list(
		@GetUser() user: AuthenticatedUser,
	): Promise<VisibleTreeResponseDTO> {
		return this.visibleTreeService.get(user.id);
	}
}
