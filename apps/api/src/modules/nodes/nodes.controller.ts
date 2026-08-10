import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { VisibleTreeResponseDTO } from "./dto/node.dto";
import type { VisibleTreeService } from "./services/tree.service";

@ApiTags("nodes")
@Controller("nodes")
export class NodesController {
	constructor(private readonly visibleTreeService: VisibleTreeService) {}

	@Get()
	@ApiOperation({
		summary:
			"Every node belonging to the current user, flat and unordered; the client builds the tree from parentId",
	})
	@ApiResponse({ status: 200, type: VisibleTreeResponseDTO })
	async list(): Promise<VisibleTreeResponseDTO> {
		// TODO: Hook up userId from auth context
		return this.visibleTreeService.get();
	}
}
