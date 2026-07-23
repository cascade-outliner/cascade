import { MAX_TAG_LENGTH } from "@cascade/outliner/node-tags";
import { describe, expect, it } from "vitest";
import {
	MAX_TAGS_PER_NODE,
	setNodeTagsInputSchema,
	tagNameSchema,
} from "@/features/nodes/model/tag-name.schema";

describe("tagNameSchema", () => {
	it("accepts names up to the limit", () => {
		expect(tagNameSchema.safeParse("a".repeat(63)).success).toBe(true);
		expect(tagNameSchema.safeParse("a".repeat(64)).success).toBe(true);
	});

	it("rejects names over the limit with a descriptive message", () => {
		const result = tagNameSchema.safeParse("a".repeat(65));
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain(String(MAX_TAG_LENGTH));
		}
	});

	it("measures length after trimming surrounding whitespace", () => {
		const padded = `   ${"a".repeat(64)}   `;
		const result = tagNameSchema.safeParse(padded);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("a".repeat(64));
		}
	});
});

describe("setNodeTagsInputSchema", () => {
	it("accepts a tag list where every name fits", () => {
		const result = setNodeTagsInputSchema.safeParse({
			id: "node-1",
			tags: ["urgent", "a".repeat(64)],
		});
		expect(result.success).toBe(true);
	});

	it("rejects the whole update when any name is over the limit", () => {
		const result = setNodeTagsInputSchema.safeParse({
			id: "node-1",
			tags: ["urgent", "a".repeat(65)],
		});
		expect(result.success).toBe(false);
	});

	it("accepts a tag list at the size cap", () => {
		const result = setNodeTagsInputSchema.safeParse({
			id: "node-1",
			tags: Array.from({ length: MAX_TAGS_PER_NODE }, (_, i) => `tag-${i}`),
		});
		expect(result.success).toBe(true);
	});

	it("rejects a tag list over the size cap", () => {
		const result = setNodeTagsInputSchema.safeParse({
			id: "node-1",
			tags: Array.from({ length: MAX_TAGS_PER_NODE + 1 }, (_, i) => `tag-${i}`),
		});
		expect(result.success).toBe(false);
	});
});
