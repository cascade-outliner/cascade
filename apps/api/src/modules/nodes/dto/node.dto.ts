import type { SerializedEditorState } from "lexical";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { metadataNodeSchema } from "./metadata.node.dto";

// Lexical content is validated on write (apps/web-app); here it's an
// opaque response field, so z.custom() keeps the SerializedEditorState
// type without re-implementing that recursive shape check.
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
