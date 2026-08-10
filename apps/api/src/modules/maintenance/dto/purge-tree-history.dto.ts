import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

export class PurgeTreeHistoryRequestDto {
	@ApiPropertyOptional({
		description:
			"Retention window in days; defaults to the TREE_HISTORY_RETENTION_DAYS env var.",
		minimum: 0,
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	days?: number;

	@ApiPropertyOptional({
		description:
			"When true, report what would be purged without deleting anything.",
		default: false,
	})
	@IsOptional()
	@IsBoolean()
	dryRun?: boolean;
}

export class PurgeTreeHistoryResponseDto {
	@ApiProperty({ description: "Retention window (in days) actually used." })
	days!: number;

	@ApiProperty({ description: "Whether this was a dry run." })
	dryRun!: boolean;

	@ApiProperty({
		description: "Number of tree-history events purged (or that would be).",
	})
	purgedCount!: number;
}
