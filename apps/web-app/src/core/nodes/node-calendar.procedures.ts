import { and, asc, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { nodeTagNames } from "@/core/nodes/node.queries";
import { nodes } from "@/core/nodes/node.schema";
import { dueDateSchema } from "@/core/nodes/node-due-date-schema";
import { db } from "@/db";
import { authed } from "@/orpc/context";

const yearColumn = sql<number>`EXTRACT(YEAR FROM ${nodes.dueDate})::int`;
const monthColumn = sql<number>`EXTRACT(MONTH FROM ${nodes.dueDate})::int`;
const dayColumn = sql<number>`EXTRACT(DAY FROM ${nodes.dueDate})::int`;

const yearSchema = z.number().int().min(1);
const monthSchema = z.number().int().min(1).max(12);

/**
 * Read side of the always-present Calendar entry: everything is derived
 * live from `nodes.dueDate` (see #323, #344) rather than persisted rows, so
 * a year/month/day only ever appears once it actually has a due node, and
 * disappears again once its last one is cleared or deleted — no sync code
 * needed. A node keeps its single real `parentId`; this is a read-only
 * alternate projection over the same rows, not a second tree.
 */
export const calendarYears = authed.handler(async ({ context }) => {
	return await db
		.select({ year: yearColumn, count: count() })
		.from(nodes)
		.where(
			and(eq(nodes.userId, context.user.id), sql`${nodes.dueDate} IS NOT NULL`),
		)
		.groupBy(yearColumn)
		.orderBy(asc(yearColumn));
});

export const calendarMonths = authed
	.input(z.object({ year: yearSchema }))
	.handler(async ({ input, context }) => {
		return await db
			.select({ month: monthColumn, count: count() })
			.from(nodes)
			.where(and(eq(nodes.userId, context.user.id), eq(yearColumn, input.year)))
			.groupBy(monthColumn)
			.orderBy(asc(monthColumn));
	});

export const calendarDays = authed
	.input(z.object({ year: yearSchema, month: monthSchema }))
	.handler(async ({ input, context }) => {
		return await db
			.select({ day: dayColumn, count: count() })
			.from(nodes)
			.where(
				and(
					eq(nodes.userId, context.user.id),
					eq(yearColumn, input.year),
					eq(monthColumn, input.month),
				),
			)
			.groupBy(dayColumn)
			.orderBy(asc(dayColumn));
	});

/** The due nodes for one calendar day, for the Calendar entry's leaf list. */
export const calendarDayNodes = authed
	.input(z.object({ date: dueDateSchema }))
	.handler(async ({ input, context }) => {
		return await db
			.select({
				id: nodes.id,
				content: nodes.content,
				type: nodes.type,
				metadata: nodes.metadata,
				tags: nodeTagNames(sql`${nodes.id}`),
			})
			.from(nodes)
			.where(
				and(eq(nodes.userId, context.user.id), eq(nodes.dueDate, input.date)),
			)
			.orderBy(asc(nodes.createdAt));
	});
