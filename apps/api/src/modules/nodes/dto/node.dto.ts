import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { NodeStatusSummaryDto } from "./node-status-summary.dto";

/**
 * Mirrors the row shape apps/web-app's `nodeColumns` selects (see
 * infrastructure/node-columns.ts) — `content`/`metadata`/`recurrence` stay
 * `unknown`/`object` here since they're opaque jsonb payloads the client
 * (not this API) interprets.
 */
export class NodeResponseDto {
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
	hasChildren!: boolean;

	@ApiProperty()
	isBoard!: boolean;

	@ApiProperty()
	parentIsBoard!: boolean;
}
