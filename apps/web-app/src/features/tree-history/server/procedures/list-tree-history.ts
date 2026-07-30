import { and, desc, eq, gt, lt, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import { requirePremium } from "@/features/premium/server/premium-access";
import {
	type TreeHistorySummary,
	treeHistoryPayloadSchema,
} from "../../model/tree-history.schema";
import { treeHistoryEvents } from "../tree-history-table";
import { cursorSchema, cutoff, isEventCurrentlyRestorable } from "./shared";

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
