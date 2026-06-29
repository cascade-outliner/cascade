import { os } from "@orpc/server";
import { isNull } from "drizzle-orm";
import { nodes } from "#/core/nodes/node.schema";
import { db } from "#/db";

export const listNodes = os.handler(async () => {
	return db
		.select({
			id: nodes.id,
			parentId: nodes.parentId,
			text: nodes.text,
		})
		.from(nodes)
		.where(isNull(nodes.parentId));
});
