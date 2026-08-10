import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { SessionUser } from "../auth/guards/session.guard";
// biome-ignore lint/style/useImportType: constructor-injected services; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { GetNodeService } from "./application/get-node.service";
// biome-ignore lint/style/useImportType: constructor-injected services; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { GetNodeAncestorsService } from "./application/get-node-ancestors.service";
// biome-ignore lint/style/useImportType: constructor-injected services; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { ListDueSoonService } from "./application/list-due-soon.service";
// biome-ignore lint/style/useImportType: constructor-injected services; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { ListNodesService } from "./application/list-nodes.service";
// biome-ignore lint/style/useImportType: constructor-injected services; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { ListStatusesService } from "./application/list-statuses.service";
// biome-ignore lint/style/useImportType: constructor-injected services; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { ListTagsService } from "./application/list-tags.service";
// biome-ignore lint/style/useImportType: constructor-injected services; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { QuickOpenService } from "./application/quick-open.service";
// biome-ignore lint/style/useImportType: constructor-injected services; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { ResolveNodeSlugService } from "./application/resolve-node-slug.service";
// biome-ignore lint/style/useImportType: constructor-injected services; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { VisibleTreeService } from "./application/visible-tree.service";
import { DueSoonResponseDto } from "./dto/due-soon.dto";
import { NodeResponseDto } from "./dto/node.dto";
import { NodeAncestorResponseDto } from "./dto/node-ancestor.dto";
import {
	type QuickOpenQueryDto,
	QuickOpenResultDto,
} from "./dto/quick-open.dto";
import {
	type ResolveNodeSlugQueryDto,
	ResolveNodeSlugResponseDto,
} from "./dto/resolve-node-slug.dto";
import { type ListStatusesQueryDto, StatusResponseDto } from "./dto/status.dto";
import { TagResponseDto } from "./dto/tag.dto";
import { VisibleTreeResponseDto } from "./dto/visible-tree.dto";

/**
 * Read-only node/tag/status endpoints ported from apps/web-app's oRPC
 * `nodes` procedures per MIGRATION.md's Phase 2. Every method re-scopes its
 * query by `@CurrentUser()`'s id, matching apps/web-app's "no separate
 * authorization layer" convention (see CLAUDE.md).
 */
@ApiTags("nodes")
@Controller("nodes")
export class NodesController {
	constructor(
		private readonly getNodeService: GetNodeService,
		private readonly getNodeAncestorsService: GetNodeAncestorsService,
		private readonly visibleTreeService: VisibleTreeService,
		private readonly listNodesService: ListNodesService,
		private readonly resolveNodeSlugService: ResolveNodeSlugService,
		private readonly listDueSoonService: ListDueSoonService,
		private readonly quickOpenService: QuickOpenService,
	) {}

	@Get()
	@ApiOperation({
		summary:
			"Every node belonging to the current user, flat and unordered — the client builds the tree from parentId itself",
	})
	@ApiResponse({ status: 200, type: VisibleTreeResponseDto })
	async list(
		@CurrentUser() user: SessionUser,
	): Promise<VisibleTreeResponseDto> {
		return this.visibleTreeService.get(user.id);
	}

	@Get("children")
	@ApiOperation({
		summary:
			"The direct children of one parent (or root nodes, when parentId is omitted), ordered by sibling order",
	})
	@ApiResponse({ status: 200, type: [NodeResponseDto] })
	async children(
		@CurrentUser() user: SessionUser,
		@Query("parentId") parentId?: string,
	): Promise<NodeResponseDto[]> {
		return this.listNodesService.list(
			parentId ?? null,
			user.id,
		) as unknown as NodeResponseDto[];
	}

	@Get("due-soon")
	@ApiOperation({ summary: "Nodes due in roughly the next day" })
	@ApiResponse({ status: 200, type: DueSoonResponseDto })
	async dueSoon(@CurrentUser() user: SessionUser): Promise<DueSoonResponseDto> {
		return this.listDueSoonService.list(user.id);
	}

	@Get("quick-open")
	@ApiOperation({ summary: "Search this user's nodes by content" })
	@ApiResponse({ status: 200, type: [QuickOpenResultDto] })
	async quickOpen(
		@CurrentUser() user: SessionUser,
		@Query() query: QuickOpenQueryDto,
	): Promise<QuickOpenResultDto[]> {
		return this.quickOpenService.search(query.query, user.id);
	}

	@Get("resolve/:slug")
	@ApiOperation({ summary: "Resolve a node URL slug to a node id" })
	@ApiResponse({ status: 200, type: ResolveNodeSlugResponseDto })
	async resolveSlug(
		@CurrentUser() user: SessionUser,
		@Param("slug") slugId: string,
		@Query() query: ResolveNodeSlugQueryDto,
	): Promise<ResolveNodeSlugResponseDto> {
		return this.resolveNodeSlugService.resolve(
			slugId,
			query.slugText ?? null,
			user.id,
		);
	}

	@Get(":id")
	@ApiOperation({ summary: "Get a single node by id" })
	@ApiResponse({ status: 200, type: NodeResponseDto })
	async get(
		@CurrentUser() user: SessionUser,
		@Param("id") id: string,
	): Promise<NodeResponseDto> {
		return this.getNodeService.get(id, user.id) as unknown as NodeResponseDto;
	}

	@Get(":id/ancestors")
	@ApiOperation({ summary: "This node's ancestor chain, root first" })
	@ApiResponse({ status: 200, type: [NodeAncestorResponseDto] })
	async ancestors(
		@CurrentUser() user: SessionUser,
		@Param("id") id: string,
	): Promise<NodeAncestorResponseDto[]> {
		return this.getNodeAncestorsService.get(id, user.id);
	}
}

@ApiTags("tags")
@Controller("tags")
export class TagsController {
	constructor(private readonly listTagsService: ListTagsService) {}

	@Get()
	@ApiOperation({ summary: "This user's tags with usage counts" })
	@ApiResponse({ status: 200, type: [TagResponseDto] })
	async list(@CurrentUser() user: SessionUser): Promise<TagResponseDto[]> {
		return this.listTagsService.list(user.id);
	}
}

@ApiTags("statuses")
@Controller("statuses")
export class StatusesController {
	constructor(private readonly listStatusesService: ListStatusesService) {}

	@Get()
	@ApiOperation({ summary: "A board's statuses with usage counts" })
	@ApiResponse({ status: 200, type: [StatusResponseDto] })
	async list(
		@CurrentUser() user: SessionUser,
		@Query() query: ListStatusesQueryDto,
	): Promise<StatusResponseDto[]> {
		return this.listStatusesService.list(user.id, query.boardId);
	}
}
