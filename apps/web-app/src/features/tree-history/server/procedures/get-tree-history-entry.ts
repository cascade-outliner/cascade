import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import { requirePremium } from "@/features/premium/server/premium-access";
import {
	type TreeHistorySnapshot,
	treeHistoryPayloadSchema,
} from "../../model/tree-history.schema";
import { treeHistoryEvents, treeHistorySnapshots } from "../tree-history-table";
import { cutoff, isEventCurrentlyRestorable } from "./shared";

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
					recurrence: snapshot.recurrence,
					tags: snapshot.tags,
					depth: snapshot.depth,
					isRoot: snapshot.isRoot,
					phase: snapshot.phase,
				}),
			),
		};
	});
