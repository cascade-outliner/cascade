import { normalizeTags } from "@cascade/outliner/node-tags";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { nodes, nodeTags, tags as tagsTable } from "@/core/nodes/node.schema";
import { setNodeTagsInputSchema } from "@/core/nodes/tag-name-schema";
import { db } from "@/db";
import { authed } from "@/orpc/context";

/** This user's tags with how many nodes each is on, sorted by name. */
export const listTags = authed.handler(async ({ context }) => {
	return await db
		.select({ name: tagsTable.name, count: count(nodeTags.nodeId) })
		.from(tagsTable)
		.leftJoin(nodeTags, eq(nodeTags.tagId, tagsTable.id))
		.where(eq(tagsTable.userId, context.user.id))
		.groupBy(tagsTable.id)
		.orderBy(asc(tagsTable.name));
});

/** Deletes a tag outright (cascades to every node it's on), not just one node's use of it. */
export const deleteTag = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Tag not found" },
	})
	.input(z.object({ name: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const deleted = await db
			.delete(tagsTable)
			.where(
				and(
					eq(tagsTable.userId, context.user.id),
					eq(tagsTable.name, input.name),
				),
			)
			.returning({ id: tagsTable.id });
		if (deleted.length === 0) throw errors.NOT_FOUND();
	});

export const setNodeTags = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(setNodeTagsInputSchema)
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		const names = normalizeTags(input.tags);

		await db.transaction(async (tx) => {
			const [node] = await tx
				.select({ id: nodes.id })
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.limit(1);
			if (!node) throw errors.NOT_FOUND();

			let tagIds: string[] = [];
			if (names.length > 0) {
				// onConflictDoUpdate (no-op set) so RETURNING also yields ids for
				// tags that already existed, not just newly-inserted ones.
				const rows = await tx
					.insert(tagsTable)
					.values(names.map((name) => ({ userId, name })))
					.onConflictDoUpdate({
						target: [tagsTable.userId, tagsTable.name],
						set: { name: sql`excluded.name` },
					})
					.returning({ id: tagsTable.id });
				tagIds = rows.map((r) => r.id);
			}

			await tx.delete(nodeTags).where(eq(nodeTags.nodeId, input.id));
			if (tagIds.length > 0) {
				await tx
					.insert(nodeTags)
					.values(tagIds.map((tagId) => ({ nodeId: input.id, tagId })));
			}
		});
	});
