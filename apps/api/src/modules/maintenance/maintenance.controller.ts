import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
// biome-ignore lint/style/useImportType: PurgeTreeHistoryService is constructor-injected; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { PurgeTreeHistoryService } from "./application/purge-tree-history.service";
// biome-ignore lint/style/useImportType: PurgeTreeHistoryRequestDto is used as a @Body() parameter type; emitDecoratorMetadata/ValidationPipe need the real runtime class, not an erased type-only import.
import {
	PurgeTreeHistoryRequestDto,
	PurgeTreeHistoryResponseDto,
} from "./dto/purge-tree-history.dto";
import { PurgeTokenGuard } from "./guards/purge-token.guard";

/**
 * Mirrors apps/web-app's POST /api/maintenance/purge-tree-history (see
 * MIGRATION.md's Phase 1) — same token-guard convention, same request/
 * response shape. Token-guarded, not session-guarded: this is an ops/cron
 * target, not something a logged-in user calls.
 */
@ApiTags("maintenance")
@Controller("maintenance")
@Public()
@UseGuards(PurgeTokenGuard)
export class MaintenanceController {
	constructor(
		private readonly purgeTreeHistoryService: PurgeTreeHistoryService,
	) {}

	@Post("purge-tree-history")
	@HttpCode(200)
	@ApiOperation({
		summary: "Purge tree-history events older than the retention window",
	})
	@ApiResponse({ status: 200, type: PurgeTreeHistoryResponseDto })
	async purgeTreeHistory(
		@Body() body: PurgeTreeHistoryRequestDto,
	): Promise<PurgeTreeHistoryResponseDto> {
		const result = await this.purgeTreeHistoryService.purge(
			body.days,
			body.dryRun ?? false,
		);
		return {
			days: result.days,
			dryRun: result.dryRun,
			purgedCount: result.purgedIds.length,
		};
	}
}
