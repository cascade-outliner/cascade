import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { PurgeTreeHistoryService } from "./application/purge-tree-history.service";
import { PurgeTokenGuard } from "./guards/purge-token.guard";
import { TreeHistoryPurgeRepository } from "./infrastructure/tree-history-purge.repository";
import { MaintenanceController } from "./maintenance.controller";

@Module({
	imports: [DatabaseModule],
	controllers: [MaintenanceController],
	providers: [
		PurgeTreeHistoryService,
		TreeHistoryPurgeRepository,
		PurgeTokenGuard,
	],
})
export class MaintenanceModule {}
