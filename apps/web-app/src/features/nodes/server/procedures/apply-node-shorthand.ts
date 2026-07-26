import { normalizeTags } from "@cascade/outliner/node-tags";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { dueDateSchema } from "@/features/nodes/model/due-date.schema";
import {
	lexicalElementNodeSchema,
	MAX_CONTENT_BYTES,
} from "@/features/nodes/model/node-content.schema";
import {
	MAX_TAGS_PER_NODE,
	tagsArraySchema,
} from "@/features/nodes/model/tag-name.schema";
import {
	createHistoryRecorder,
	historyNodeLabel,
} from "@/features/tree-history/server/history-persistence";
import { authed } from "@/orpc/context";
import { nodes, nodeTags, tags } from "../persistence/node-tables";
import { lockNodeOrdering } from "../persistence/sibling-order";

const contentSchema = z
	.object({ root: lexicalElementNodeSchema })
	.refine(
		(content) =>
			Buffer.byteLength(JSON.stringify(content)) <= MAX_CONTENT_BYTES,
		{ message: "content exceeds maximum size" },
	);

const inputSchema = z.discriminatedUnion("operation", [
	z.object({
		operation: z.literal("apply"),
		id: z.string(),
		content: contentSchema,
		addedTags: tagsArraySchema,
		dueDate: dueDateSchema.optional(),
	}),
	z.object({
		operation: z.literal("restore"),
		id: z.string(),
		content: contentSchema.nullable(),
		tags: tagsArraySchema,
		dueDate: dueDateSchema.nullable(),
	}),
]);

async function nodeTagNames(
	transaction: Parameters<typeof lockNodeOrdering>[0],
	nodeId: string,
) {
	return (
		await transaction
			.select({ name: tags.name })
			.from(nodeTags)
			.innerJoin(tags, eq(tags.id, nodeTags.tagId))
			.where(eq(nodeTags.nodeId, nodeId))
			.orderBy(asc(tags.name))
	).map(({ name }) => name);
}

export const applyNodeShorthand = authed
	.errors({ NOT_FOUND: { status: 404, message: "Node not found" } })
	.input(inputSchema)
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		return db.transaction(async (transaction) => {
			// One user-scoped advisory lock also serializes rapid conversions and
			// prevents differently-cased concurrent inserts creating duplicate tags.
			await lockNodeOrdering(transaction, userId);
			const [beforeNode] = await transaction
				.select({
					id: nodes.id,
					content: nodes.content,
					dueDate: nodes.dueDate,
				})
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (!beforeNode) throw errors.NOT_FOUND();

			const beforeTags = await nodeTagNames(transaction, input.id);
			const allUserTags = await transaction
				.select({ id: tags.id, name: tags.name })
				.from(tags)
				.where(eq(tags.userId, userId));
			const canonical = new Map(
				allUserTags.map((tag) => [tag.name.toLowerCase(), tag]),
			);
			const requested =
				input.operation === "apply"
					? normalizeTags([...beforeTags, ...input.addedTags])
					: normalizeTags(input.tags);
			const canonicalNames = requested.map(
				(name) => canonical.get(name.toLowerCase())?.name ?? name,
			);
			const nextTags = normalizeTags(canonicalNames).sort((a, b) =>
				a.localeCompare(b),
			);
			if (nextTags.length > MAX_TAGS_PER_NODE) {
				throw new Error(
					`cannot set more than ${MAX_TAGS_PER_NODE} tags on a node`,
				);
			}

			const tagIds: string[] = [];
			for (const name of nextTags) {
				const existing = canonical.get(name.toLowerCase());
				if (existing) {
					tagIds.push(existing.id);
					continue;
				}
				const [created] = await transaction
					.insert(tags)
					.values({ userId, name })
					.returning({ id: tags.id, name: tags.name });
				if (created) {
					canonical.set(created.name.toLowerCase(), created);
					tagIds.push(created.id);
				}
			}

			const dueDate =
				input.operation === "restore"
					? input.dueDate
					: input.dueDate === undefined
						? beforeNode.dueDate
						: input.dueDate;
			await transaction
				.update(nodes)
				.set({ content: input.content, dueDate })
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));
			await transaction.delete(nodeTags).where(eq(nodeTags.nodeId, input.id));
			if (tagIds.length > 0) {
				await transaction
					.insert(nodeTags)
					.values(tagIds.map((tagId) => ({ nodeId: input.id, tagId })));
			}

			const history = await createHistoryRecorder(transaction, userId);
			await history.record({
				nodeId: input.id,
				payload: {
					kind: "shorthand_applied",
					label: historyNodeLabel(input.content),
					before: {
						content: beforeNode.content,
						tags: beforeTags,
						dueDate: beforeNode.dueDate,
					},
					after: { content: input.content, tags: nextTags, dueDate },
				},
			});
			return { content: input.content, tags: nextTags, dueDate };
		});
	});
