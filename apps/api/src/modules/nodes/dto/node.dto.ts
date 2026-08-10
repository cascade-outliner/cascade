import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class NodeDto {
	@ApiProperty()
	id!: string;

	@ApiProperty({ nullable: true, type: String })
	parentId!: string | null;

	@ApiPropertyOptional({ type: Object, nullable: true })
	content!: unknown;
}

export class VisibleTreeResponseDTO {
	@ApiProperty({ type: [NodeDto] })
	rows!: NodeDto[];
}
