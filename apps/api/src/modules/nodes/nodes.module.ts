import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { GetNodeService } from "./application/get-node.service";
import { GetNodeAncestorsService } from "./application/get-node-ancestors.service";
import { ListDueSoonService } from "./application/list-due-soon.service";
import { ListNodesService } from "./application/list-nodes.service";
import { ListStatusesService } from "./application/list-statuses.service";
import { ListTagsService } from "./application/list-tags.service";
import { QuickOpenService } from "./application/quick-open.service";
import { ResolveNodeSlugService } from "./application/resolve-node-slug.service";
import { VisibleTreeService } from "./application/visible-tree.service";
import { NodesRepository } from "./infrastructure/nodes.repository";
import { StatusesRepository } from "./infrastructure/statuses.repository";
import { TagsRepository } from "./infrastructure/tags.repository";
import {
	NodesController,
	StatusesController,
	TagsController,
} from "./nodes.controller";

@Module({
	imports: [DatabaseModule],
	controllers: [NodesController, TagsController, StatusesController],
	providers: [
		NodesRepository,
		TagsRepository,
		StatusesRepository,
		GetNodeService,
		GetNodeAncestorsService,
		VisibleTreeService,
		ListNodesService,
		ResolveNodeSlugService,
		ListTagsService,
		ListStatusesService,
		ListDueSoonService,
		QuickOpenService,
	],
})
export class NodesModule {}
