import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { SerializedEditorState } from "lexical";
import { MetadataNodeDto } from "./metadata.node.dto";

export class NodeDto {
	@ApiProperty()
	id!: string;

	@ApiProperty({ nullable: true, type: String })
	parentId!: string | null;

	@ApiPropertyOptional({ type: Object, nullable: true })
	content!: SerializedEditorState | null;

	@ApiPropertyOptional({ type: Object, nullable: true })
	metadata!: MetadataNodeDto | null;
}

export class VisibleTreeResponseDTO {
	@ApiProperty({ type: [NodeDto] })
	rows!: NodeDto[];
}
