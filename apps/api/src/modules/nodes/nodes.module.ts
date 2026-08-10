import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { NodesController } from "./nodes.controller";
import { NodesRepository } from "./repository/nodes.repository";
import { VisibleTreeService } from "./services/tree.service";

@Module({
	imports: [DatabaseModule],
	controllers: [NodesController],
	providers: [NodesRepository, VisibleTreeService],
})
export class NodesModule {}
