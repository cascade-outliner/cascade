import { describe, expect, it } from "vitest";
import { treeHistoryPayloadSchema } from "./tree-history.schema";

describe("treeHistoryPayloadSchema", () => {
	it("accepts move events recorded before location context was added", () => {
		const payload = {
			kind: "node_moved",
			label: "Moved node",
			before: {
				parentId: "old-parent",
				target: { position: "after", targetId: "old-sibling" },
			},
			after: {
				parentId: "new-parent",
				target: { position: "append" },
			},
		};

		expect(treeHistoryPayloadSchema.parse(payload)).toEqual(payload);
	});
});
