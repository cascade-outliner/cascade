import { MAX_TAG_LENGTH } from "@cascade/outliner/node-tags";
import { z } from "zod";

export const tagNameSchema = z
	.string()
	.trim()
	.max(MAX_TAG_LENGTH, `tag name exceeds ${MAX_TAG_LENGTH} characters`);

const nonEmptyTagNameSchema = z
	.string()
	.trim()
	.min(1, "tag name cannot be empty")
	.max(MAX_TAG_LENGTH, `tag name exceeds ${MAX_TAG_LENGTH} characters`);

export const createTagInputSchema = z.object({
	name: nonEmptyTagNameSchema,
});

export const renameTagInputSchema = z.object({
	name: z.string(),
	newName: nonEmptyTagNameSchema,
});

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
