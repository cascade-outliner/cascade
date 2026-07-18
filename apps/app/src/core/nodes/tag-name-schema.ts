import { MAX_TAG_LENGTH } from "@cascade/outliner/node-tags";
import { z } from "zod";

// Length is checked on the trimmed name because that's what normalizeTags
// ends up storing; surrounding whitespace doesn't count against the limit.
export const tagNameSchema = z
	.string()
	.trim()
	.max(MAX_TAG_LENGTH, `tag name exceeds ${MAX_TAG_LENGTH} characters`);

export const setNodeTagsInputSchema = z.object({
	id: z.string(),
	tags: z.array(tagNameSchema),
});
