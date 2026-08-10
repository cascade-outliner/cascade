import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class NodeAncestorResponseDto {
	@ApiProperty()
	id!: string;

	@ApiPropertyOptional({ type: Object, nullable: true })
	content!: unknown;
}
