import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class NodeDTO {
	@ApiProperty()
	id!: string;

	@ApiProperty({ nullable: true, type: String })
	parentId!: string | null;

	@ApiPropertyOptional({ type: Object, nullable: true })
	content!: unknown;
}

export class VisibleTreeResponseDTO {
	@ApiProperty({ type: [NodeDTO] })
	rows!: NodeDTO[];
}
