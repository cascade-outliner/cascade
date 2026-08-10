import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { NodeStatusSummaryDto } from "./node-status-summary.dto";

/**
 * Ported from apps/web-app's `FlatNodeRow` — every node belonging to the
 * current user, flat and unordered; the client builds the tree from
 * `parentId` itself. See visible-tree.ts's procedure doc comment.
 */
export class VisibleTreeRowDto {
	@ApiProperty()
	id!: string;

	@ApiProperty({ nullable: true, type: String })
	parentId!: string | null;

	@ApiPropertyOptional({ type: Object, nullable: true })
	content!: unknown;

	@ApiProperty()
	type!: string;

	@ApiPropertyOptional({ type: Object, nullable: true })
	metadata!: unknown;

	@ApiProperty()
	expanded!: boolean;

	@ApiProperty()
	order!: string;

	@ApiProperty({ nullable: true, type: String })
	dueDate!: string | null;

	@ApiProperty({ nullable: true, type: String })
	dueTime!: string | null;

	@ApiPropertyOptional({ type: Object, nullable: true })
	recurrence!: unknown;

	@ApiProperty({ nullable: true, type: String })
	icon!: string | null;

	@ApiProperty({ nullable: true, type: String })
	priority!: string | null;

	@ApiProperty({ type: NodeStatusSummaryDto, nullable: true })
	status!: NodeStatusSummaryDto | null;

	@ApiProperty({ type: [String] })
	tags!: string[];

	@ApiProperty()
	isBoard!: boolean;
}

export class VisibleTreeResponseDto {
	@ApiProperty({ type: [VisibleTreeRowDto] })
	rows!: VisibleTreeRowDto[];
}
