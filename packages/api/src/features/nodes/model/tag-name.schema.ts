import { MAX_TAG_LENGTH } from "@cascade/outliner/node-tags";
import { z } from "zod";

export const tagNameSchema = z
	.string()
	.trim()
	.max(MAX_TAG_LENGTH, `tag name exceeds ${MAX_TAG_LENGTH} characters`);

export const MAX_TAGS_PER_NODE = 50;

export const tagsArraySchema = z
	.array(tagNameSchema)
	.max(
		MAX_TAGS_PER_NODE,
		`cannot set more than ${MAX_TAGS_PER_NODE} tags on a node`,
	);

export const setNodeTagsInputSchema = z.object({
	id: z.string(),
	tags: tagsArraySchema,
});
