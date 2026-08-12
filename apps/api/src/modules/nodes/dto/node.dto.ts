import type { SerializedEditorState } from "lexical";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { metadataNodeSchema } from "./metadata.node.dto";

const nodeSchema = z.object({
	id: z.uuid(),
	parentId: z.uuid().nullable(),
	content: z.custom<SerializedEditorState>().nullable(),
	metadata: metadataNodeSchema.nullable(),
});

export class NodeDto extends createZodDto(nodeSchema) {}

const visibleTreeResponseSchema = z.object({
	rows: z.array(nodeSchema),
});

export class VisibleTreeResponseDTO extends createZodDto(
	visibleTreeResponseSchema,
) {}
