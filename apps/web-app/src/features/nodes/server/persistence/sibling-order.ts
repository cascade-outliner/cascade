import { and, asc, desc, eq, gt, isNull, lt, type SQL, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import type { db } from "@/db";
import { nodes } from "./node-tables";

export type NodeTransaction = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];

export type SiblingTarget =
	| { position: "append" }
	| { position: "before" | "after"; targetId: string };

export function siblingScope(userId: string, parentId: string | null): SQL {
	return and(
		eq(nodes.userId, userId),
		parentId === null ? isNull(nodes.parentId) : eq(nodes.parentId, parentId),
	) as SQL;
}

export function lockNodeOrdering(
	transaction: NodeTransaction,
	userId: string,
): Promise<unknown> {
	return transaction.execute(
		sql`SELECT pg_advisory_xact_lock(hashtext('nodes'), hashtext(${userId}))`,
	);
}

async function adjacentOrder(
	transaction: NodeTransaction,
	scope: SQL,
	order: string,
	direction: "previous" | "next",
): Promise<string | null> {
	const comparison =
		direction === "previous" ? lt(nodes.order, order) : gt(nodes.order, order);
	const sort = direction === "previous" ? desc(nodes.order) : asc(nodes.order);
	const [adjacent] = await transaction
		.select({ order: nodes.order })
		.from(nodes)
		.where(and(scope, comparison))
		.orderBy(sort)
		.limit(1);
	return adjacent?.order ?? null;
}

/**
 * Finds a fractional order at the requested sibling position.
 *
 * `undefined` means a named target does not exist in the supplied parent
 * scope. Append positions always return an order.
 */
export async function orderAtTarget(
	transaction: NodeTransaction,
	scope: SQL,
	target: SiblingTarget,
	lockTarget = true,
): Promise<string | undefined> {
	if (target.position === "append") {
		const [last] = await transaction
			.select({ order: nodes.order })
			.from(nodes)
			.where(scope)
			.orderBy(desc(nodes.order))
			.limit(1);
		return generateKeyBetween(last?.order ?? null, null);
	}

	const anchorQuery = transaction
		.select({ order: nodes.order })
		.from(nodes)
		.where(and(scope, eq(nodes.id, target.targetId)))
		.limit(1);
	const [anchor] = lockTarget
		? await anchorQuery.for("update")
		: await anchorQuery;
	if (!anchor) return undefined;

	if (target.position === "before") {
		const previous = await adjacentOrder(
			transaction,
			scope,
			anchor.order,
			"previous",
		);
		return generateKeyBetween(previous, anchor.order);
	}

	const next = await adjacentOrder(transaction, scope, anchor.order, "next");
	return generateKeyBetween(anchor.order, next);
}

export async function orderAfter(
	transaction: NodeTransaction,
	scope: SQL,
	order: string,
): Promise<string> {
	const next = await adjacentOrder(transaction, scope, order, "next");
	return generateKeyBetween(order, next);
}
