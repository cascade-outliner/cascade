import type { Node, Tombstone } from "@cascade/data";
import {
	createDb,
	type Db,
	type NodeRow,
	nodes,
	workspaces,
} from "@cascade/db";
import { dbEnv } from "@cascade/env/db";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, gt, lte, or, sql } from "drizzle-orm";
import { z } from "zod";

let db: Db | null | undefined;

function getDb(): Db | null {
	if (db === undefined) {
		db = dbEnv.DATABASE_URL ? createDb(dbEnv.DATABASE_URL) : null;
	}
	return db;
}

function requireDb(): Db {
	const instance = getDb();
	if (!instance) {
		throw new Error("Sync is disabled: DATABASE_URL is not set");
	}
	return instance;
}

const nodeSchema = z.object({
	id: z.string().min(1),
	parentId: z.string().min(1).nullable(),
	order: z.string().min(1),
	content: z.custom<Node["content"]>(
		(value) => typeof value === "object" && value !== null,
	),
	collapsed: z.boolean(),
	task: z.object({ done: z.boolean() }).optional(),
	updatedAt: z.number().int().nonnegative(),
});

const tombstoneSchema = z.object({
	id: z.string().min(1),
	deletedAt: z.number().int().nonnegative(),
});

const workspaceId = z.string().uuid();

const pushSchema = z.object({
	workspaceId,
	put: z.array(nodeSchema).max(1_000),
	delete: z.array(tombstoneSchema).max(1_000),
	onboarding: z
		.object({ completedAt: z.number().int().nonnegative() })
		.optional(),
});

const CURSOR =
	/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}(:?\d{2})?)\|[^|]+$/;

const pullSchema = z.object({
	workspaceId,
	since: z.string().regex(CURSOR).nullable(),
});

const PULL_LIMIT = 500;

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Keyset cursor: the last row's `synced_at` (as Postgres prints it, microseconds kept) and id. */
function encodeCursor(row: NodeRow): string {
	return `${row.syncedAt}|${row.id}`;
}

function decodeCursor(cursor: string): { syncedAt: string; id: string } {
	const at = cursor.indexOf("|");
	return { syncedAt: cursor.slice(0, at), id: cursor.slice(at + 1) };
}

/** `Node` as it crosses the wire: content is opaque JSON so the RPC layer can verify it serializes. */
export type WireNode = Omit<Node, "content"> & { content: Json };

export interface WirePullResponse {
	put: WireNode[];
	delete: Tombstone[];
	cursor: string | null;
	known?: boolean;
}

export const getSyncConfig = createServerFn({ method: "GET" }).handler(
	async () => ({ enabled: getDb() !== null }),
);

export const pushChanges = createServerFn({ method: "POST" })
	.validator(pushSchema)
	.handler(async ({ data }) => {
		const instance = requireDb();
		await instance.transaction(async (tx) => {
			const onboarding = data.onboarding
				? { onboardedAt: new Date(data.onboarding.completedAt) }
				: null;
			const workspace = tx
				.insert(workspaces)
				.values({ id: data.workspaceId, ...onboarding });
			await (onboarding
				? workspace.onConflictDoUpdate({
						target: workspaces.id,
						set: onboarding,
					})
				: workspace.onConflictDoNothing());

			for (const node of data.put) {
				await tx
					.insert(nodes)
					.values({
						workspaceId: data.workspaceId,
						id: node.id,
						parentId: node.parentId,
						order: node.order,
						content: node.content,
						collapsed: node.collapsed,
						task: node.task ?? null,
						updatedAt: node.updatedAt,
						deletedAt: null,
					})
					.onConflictDoUpdate({
						target: [nodes.workspaceId, nodes.id],
						set: {
							parentId: sql`excluded.parent_id`,
							order: sql`excluded."order"`,
							content: sql`excluded.content`,
							collapsed: sql`excluded.collapsed`,
							task: sql`excluded.task`,
							updatedAt: sql`excluded.updated_at`,
							deletedAt: null,
							syncedAt: sql`now()`,
						},
						setWhere: sql`${nodes.updatedAt} < excluded.updated_at`,
					});
			}

			for (const tombstone of data.delete) {
				await tx
					.delete(nodes)
					.where(
						and(
							eq(nodes.workspaceId, data.workspaceId),
							eq(nodes.id, tombstone.id),
							lte(nodes.updatedAt, tombstone.deletedAt),
						),
					);
			}
		});
	});

export const pullChanges = createServerFn({ method: "GET" })
	.validator(pullSchema)
	.handler(async ({ data }): Promise<WirePullResponse> => {
		const instance = requireDb();
		const since = data.since ? decodeCursor(data.since) : null;
		const rows = await instance
			.select()
			.from(nodes)
			.where(
				and(
					eq(nodes.workspaceId, data.workspaceId),
					since
						? or(
								gt(nodes.syncedAt, since.syncedAt),
								and(eq(nodes.syncedAt, since.syncedAt), gt(nodes.id, since.id)),
							)
						: undefined,
				),
			)
			.orderBy(asc(nodes.syncedAt), asc(nodes.id))
			.limit(PULL_LIMIT);

		const response: WirePullResponse = {
			put: [],
			delete: [],
			cursor: data.since,
		};
		for (const row of rows) {
			if (row.deletedAt !== null) {
				response.delete.push({ id: row.id, deletedAt: row.deletedAt });
			} else {
				response.put.push(toNode(row));
			}
		}
		const last = rows.at(-1);
		if (last) {
			response.cursor = encodeCursor(last);
		}
		if (data.since === null) {
			const [workspace] = await instance
				.select({ id: workspaces.id })
				.from(workspaces)
				.where(eq(workspaces.id, data.workspaceId));
			response.known = workspace !== undefined;
		}
		return response;
	});

function toNode(row: NodeRow): WireNode {
	return {
		id: row.id,
		parentId: row.parentId,
		order: row.order,
		content: row.content as unknown as Json,
		collapsed: row.collapsed,
		task: row.task ?? undefined,
		updatedAt: row.updatedAt,
	};
}
