import { normalizeTags } from "@cascade/outliner/node-tags";
import type { NodeMetadata, NodeTypeName } from "@cascade/outliner/node-types";
import { and, desc, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db";
import type { RestoreNodeInput } from "../../nodes/model/subtree-snapshot.schema";
import {
	nodes,
	nodeTags,
	tags,
} from "../../nodes/server/persistence/node-tables";
import {
	lockNodeOrdering,
	type NodeTransaction,
	orderAtTarget,
	siblingScope,
} from "../../nodes/server/persistence/sibling-order";
import { restoreSubtree } from "../../nodes/server/persistence/subtree-restore";
import { ancestorsOf } from "../../nodes/server/persistence/tree-cte";
import { requirePremium } from "../../premium/server/premium-access";
import {
	type HistoryRestoreTarget,
	RESTORABLE_HISTORY_KINDS,
	type TreeHistoryPayload,
	type TreeHistoryRestoreResult,
	type TreeHistorySnapshot,
	type TreeHistorySummary,
	treeHistoryPayloadSchema,
} from "../model/tree-history.schema";
import {
	captureRestoreTarget,
	captureSubtree,
	createHistoryRecorder,
	historyNodeLabel,
} from "./history-persistence";
import { treeHistoryEvents, treeHistorySnapshots } from "./tree-history-table";

const RETENTION_DAYS = 30;
const cutoff = () => new Date(Date.now() - RETENTION_DAYS * 86_400_000);

const cursorSchema = z.object({
	createdAt: z.string().datetime(),
	id: z.string(),
});

function isEventCurrentlyRestorable(
	kind: TreeHistorySummary["kind"],
	nodeId: string | null,
	currentNodeId: string | null,
): boolean {
	if (!RESTORABLE_HISTORY_KINDS.has(kind)) return false;
	if (kind === "tag_deleted") return true;
	if (kind === "subtree_deleted") return currentNodeId === null;
	return nodeId !== null && currentNodeId !== null;
}

export const listTreeHistory = requirePremium
	.input(
		z.object({
			cursor: cursorSchema.nullable().optional(),
			limit: z.number().int().min(1).max(100).default(50),
		}),
	)
	.handler(async ({ input, context }) => {
		const cursorDate = input.cursor
			? new Date(input.cursor.createdAt)
			: undefined;
		const rows = await db
			.select({
				id: treeHistoryEvents.id,
				kind: treeHistoryEvents.kind,
				nodeId: treeHistoryEvents.nodeId,
				payload: treeHistoryEvents.payload,
				createdAt: treeHistoryEvents.createdAt,
				restoredFromEventId: treeHistoryEvents.restoredFromEventId,
				currentNodeId: nodes.id,
			})
			.from(treeHistoryEvents)
			.leftJoin(
				nodes,
				and(
					eq(nodes.id, treeHistoryEvents.nodeId),
					eq(nodes.userId, context.user.id),
				),
			)
			.where(
				and(
					eq(treeHistoryEvents.userId, context.user.id),
					gt(treeHistoryEvents.createdAt, cutoff()),
					cursorDate && input.cursor
						? or(
								lt(treeHistoryEvents.createdAt, cursorDate),
								and(
									eq(treeHistoryEvents.createdAt, cursorDate),
									lt(treeHistoryEvents.id, input.cursor.id),
								),
							)
						: undefined,
				),
			)
			.orderBy(desc(treeHistoryEvents.createdAt), desc(treeHistoryEvents.id))
			.limit(input.limit + 1);

		const page = rows.slice(0, input.limit);
		const items: TreeHistorySummary[] = page.map((row) => {
			const payload = treeHistoryPayloadSchema.parse(row.payload);
			return {
				id: row.id,
				kind: row.kind,
				nodeId: row.nodeId,
				label: payload.label,
				createdAt: row.createdAt.toISOString(),
				restoredFromEventId: row.restoredFromEventId,
				restorable: isEventCurrentlyRestorable(
					row.kind,
					row.nodeId,
					row.currentNodeId,
				),
				nodeDeleted: row.nodeId !== null && row.currentNodeId === null,
			};
		});
		const last = items.at(-1);
		return {
			items,
			nextCursor:
				rows.length > input.limit && last
					? { createdAt: last.createdAt, id: last.id }
					: null,
		};
	});

export const getTreeHistoryEntry = requirePremium
	.errors({ NOT_FOUND: { status: 404, message: "History entry not found" } })
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const [event] = await db
			.select()
			.from(treeHistoryEvents)
			.where(
				and(
					eq(treeHistoryEvents.id, input.id),
					eq(treeHistoryEvents.userId, context.user.id),
					gt(treeHistoryEvents.createdAt, cutoff()),
				),
			)
			.limit(1);
		if (!event) throw errors.NOT_FOUND();

		const currentNode = event.nodeId
			? await db
					.select({ id: nodes.id })
					.from(nodes)
					.where(
						and(eq(nodes.id, event.nodeId), eq(nodes.userId, context.user.id)),
					)
					.limit(1)
			: [];
		const snapshots = await db
			.select()
			.from(treeHistorySnapshots)
			.where(eq(treeHistorySnapshots.eventId, event.id))
			.orderBy(treeHistorySnapshots.depth, treeHistorySnapshots.order);
		const payload = treeHistoryPayloadSchema.parse(event.payload);

		return {
			id: event.id,
			kind: event.kind,
			nodeId: event.nodeId,
			label: payload.label,
			createdAt: event.createdAt.toISOString(),
			restoredFromEventId: event.restoredFromEventId,
			restorable: isEventCurrentlyRestorable(
				event.kind,
				event.nodeId,
				currentNode[0]?.id ?? null,
			),
			nodeDeleted: event.nodeId !== null && currentNode.length === 0,
			payload,
			snapshots: snapshots.map(
				(snapshot): TreeHistorySnapshot => ({
					nodeId: snapshot.nodeId,
					parentId: snapshot.parentId,
					content: snapshot.content,
					type: snapshot.type,
					metadata: snapshot.metadata,
					expanded: snapshot.expanded,
					order: snapshot.order,
					dueDate: snapshot.dueDate,
					tags: snapshot.tags,
					depth: snapshot.depth,
					isRoot: snapshot.isRoot,
					phase: snapshot.phase,
				}),
			),
		};
	});

async function existingParentOrRoot(
	transaction: NodeTransaction,
	userId: string,
	parentId: string | null,
): Promise<string | null> {
	if (parentId === null) return null;
	const [parent] = await transaction
		.select({ id: nodes.id })
		.from(nodes)
		.where(and(eq(nodes.id, parentId), eq(nodes.userId, userId)))
		.limit(1);
	return parent?.id ?? null;
}

async function orderAtTargetOrAppend(
	transaction: NodeTransaction,
	userId: string,
	parentId: string | null,
	target: HistoryRestoreTarget,
): Promise<string> {
	return (
		(await orderAtTarget(
			transaction,
			siblingScope(userId, parentId),
			target,
		)) ??
		((await orderAtTarget(transaction, siblingScope(userId, parentId), {
			position: "append",
		})) as string)
	);
}

async function setTags(
	transaction: NodeTransaction,
	userId: string,
	nodeId: string,
	namesInput: string[],
) {
	const names = normalizeTags(namesInput).sort((a, b) => a.localeCompare(b));
	const tagIds =
		names.length === 0
			? []
			: (
					await transaction
						.insert(tags)
						.values(names.map((name) => ({ userId, name })))
						.onConflictDoUpdate({
							target: [tags.userId, tags.name],
							set: { name: sql`excluded.name` },
						})
						.returning({ id: tags.id })
				).map(({ id }) => id);
	await transaction.delete(nodeTags).where(eq(nodeTags.nodeId, nodeId));
	if (tagIds.length > 0) {
		await transaction
			.insert(nodeTags)
			.values(tagIds.map((tagId) => ({ nodeId, tagId })));
	}
	return names;
}

async function currentTags(
	transaction: NodeTransaction,
	nodeId: string,
): Promise<string[]> {
	return (
		await transaction
			.select({ name: tags.name })
			.from(nodeTags)
			.innerJoin(tags, eq(tags.id, nodeTags.tagId))
			.where(eq(nodeTags.nodeId, nodeId))
			.orderBy(tags.name)
	).map(({ name }) => name);
}

export const restoreTreeHistoryEntry = requirePremium
	.errors({
		NOT_FOUND: { status: 404, message: "History entry not found" },
		NOT_RESTORABLE: { status: 422, message: "History entry is not restorable" },
		INVALID_MOVE: { status: 422, message: "Restored location is invalid" },
	})
	.input(z.object({ id: z.string() }))
	.handler(
		async ({ input, context, errors }): Promise<TreeHistoryRestoreResult> => {
			const userId = context.user.id;
			return db.transaction(async (transaction) => {
				await lockNodeOrdering(transaction, userId);
				const [stored] = await transaction
					.select()
					.from(treeHistoryEvents)
					.where(
						and(
							eq(treeHistoryEvents.id, input.id),
							eq(treeHistoryEvents.userId, userId),
							gt(treeHistoryEvents.createdAt, cutoff()),
						),
					)
					.for("update");
				if (!stored) throw errors.NOT_FOUND();
				if (!RESTORABLE_HISTORY_KINDS.has(stored.kind)) {
					throw errors.NOT_RESTORABLE();
				}
				const payload = treeHistoryPayloadSchema.parse(stored.payload);
				const history = await createHistoryRecorder(transaction, userId);

				if (payload.kind === "tag_deleted") {
					const existingNodeIds =
						payload.nodeIds.length === 0
							? []
							: (
									await transaction
										.select({ id: nodes.id })
										.from(nodes)
										.where(
											and(
												eq(nodes.userId, userId),
												inArray(nodes.id, payload.nodeIds),
											),
										)
								).map(({ id }) => id);
					const [tag] = await transaction
						.insert(tags)
						.values({ userId, name: payload.name })
						.onConflictDoUpdate({
							target: [tags.userId, tags.name],
							set: { name: sql`excluded.name` },
						})
						.returning({ id: tags.id });
					if (tag && existingNodeIds.length > 0) {
						await transaction
							.insert(nodeTags)
							.values(
								existingNodeIds.map((nodeId) => ({
									nodeId,
									tagId: tag.id,
								})),
							)
							.onConflictDoNothing();
					}
					const eventId = await history.record({
						nodeId: null,
						payload: {
							kind: "tag_restored",
							label: payload.name,
							name: payload.name,
							nodeIds: existingNodeIds,
						},
						restoredFromEventId: stored.id,
					});
					return {
						eventId: eventId as string,
						affectedNodeIds: existingNodeIds,
					};
				}

				if (payload.kind === "subtree_deleted") {
					const snapshotRows = await transaction
						.select()
						.from(treeHistorySnapshots)
						.where(
							and(
								eq(treeHistorySnapshots.eventId, stored.id),
								eq(treeHistorySnapshots.phase, "before"),
							),
						)
						.orderBy(treeHistorySnapshots.depth, treeHistorySnapshots.order);
					const root = snapshotRows.find((row) => row.isRoot);
					if (!root || snapshotRows.length === 0) throw errors.NOT_RESTORABLE();
					const collisions = await transaction
						.select({ id: nodes.id })
						.from(nodes)
						.where(
							inArray(
								nodes.id,
								snapshotRows.map(({ nodeId }) => nodeId),
							),
						)
						.limit(1);
					if (collisions.length > 0) throw errors.NOT_RESTORABLE();

					const parentId = await existingParentOrRoot(
						transaction,
						userId,
						payload.location.parentId,
					);
					const target =
						parentId === payload.location.parentId
							? payload.location.target
							: ({ position: "append" } as const);
					const order = await orderAtTargetOrAppend(
						transaction,
						userId,
						parentId,
						target,
					);
					await restoreSubtree(transaction, {
						userId,
						parentId,
						order,
						root: {
							id: root.nodeId,
							content: root.content,
							type: root.type,
							metadata: root.metadata,
							expanded: root.expanded,
							dueDate: root.dueDate,
							tags: root.tags,
						} as RestoreNodeInput["root"],
						descendants: snapshotRows
							.filter((row) => !row.isRoot)
							.map((row) => ({
								id: row.nodeId,
								parentId: row.parentId as string,
								order: row.order,
								content: row.content,
								type: row.type,
								metadata: row.metadata,
								expanded: row.expanded,
								dueDate: row.dueDate,
								tags: row.tags,
							})) as RestoreNodeInput["descendants"],
					});
					const after = await captureSubtree(
						transaction,
						root.nodeId,
						userId,
						"after",
					);
					const eventId = await history.record({
						nodeId: root.nodeId,
						payload: {
							kind: "subtree_restored",
							label: payload.label,
							count: after.length,
						},
						snapshots: after,
						restoredFromEventId: stored.id,
					});
					return {
						eventId: eventId as string,
						affectedNodeIds: after.map((node) => node.nodeId),
					};
				}

				const nodeId = stored.nodeId;
				if (!nodeId) throw errors.NOT_RESTORABLE();
				const [current] = await transaction
					.select()
					.from(nodes)
					.where(and(eq(nodes.id, nodeId), eq(nodes.userId, userId)))
					.for("update");
				if (!current)
					throw errors.NOT_FOUND({
						message: "Restore the node's deletion entry first",
					});
				let nextPayload: TreeHistoryPayload;

				switch (payload.kind) {
					case "content_changed":
						await transaction
							.update(nodes)
							.set({ content: payload.before })
							.where(eq(nodes.id, nodeId));
						nextPayload = {
							kind: "content_changed",
							label: historyNodeLabel(payload.before),
							before: current.content,
							after: payload.before,
						};
						break;
					case "type_changed":
						await transaction
							.update(nodes)
							.set({
								type: payload.before.type as NodeTypeName,
								metadata: payload.before.metadata as NodeMetadata,
							})
							.where(eq(nodes.id, nodeId));
						nextPayload = {
							kind: "type_changed",
							label: historyNodeLabel(current.content),
							before: { type: current.type, metadata: current.metadata },
							after: payload.before,
						};
						break;
					case "due_date_changed":
						await transaction
							.update(nodes)
							.set({ dueDate: payload.before })
							.where(eq(nodes.id, nodeId));
						nextPayload = {
							kind: "due_date_changed",
							label: historyNodeLabel(current.content),
							before: current.dueDate,
							after: payload.before,
						};
						break;
					case "tags_changed": {
						const before = await currentTags(transaction, nodeId);
						const after = await setTags(
							transaction,
							userId,
							nodeId,
							payload.before,
						);
						nextPayload = {
							kind: "tags_changed",
							label: historyNodeLabel(current.content),
							before,
							after,
						};
						break;
					}
					case "node_moved": {
						const beforeTarget = await captureRestoreTarget(
							transaction,
							userId,
							current.parentId,
							current.order,
						);
						const parentId = await existingParentOrRoot(
							transaction,
							userId,
							payload.before.parentId,
						);
						if (parentId) {
							const chain = (await transaction.execute(sql`
							WITH RECURSIVE ${ancestorsOf(parentId, userId)}
							SELECT id FROM chain
						`)) as unknown as { id: string }[];
							if (chain.some(({ id }) => id === nodeId)) {
								throw errors.INVALID_MOVE();
							}
						}
						const target =
							parentId === payload.before.parentId
								? payload.before.target
								: ({ position: "append" } as const);
						const order = await orderAtTargetOrAppend(
							transaction,
							userId,
							parentId,
							target,
						);
						await transaction
							.update(nodes)
							.set({ parentId, order })
							.where(eq(nodes.id, nodeId));
						nextPayload = {
							kind: "node_moved",
							label: historyNodeLabel(current.content),
							before: { parentId: current.parentId, target: beforeTarget },
							after: { parentId, target },
						};
						break;
					}
					default:
						throw errors.NOT_RESTORABLE();
				}

				const eventId = await history.record({
					nodeId,
					payload: nextPayload,
					restoredFromEventId: stored.id,
				});
				return { eventId: eventId as string, affectedNodeIds: [nodeId] };
			});
		},
	);
