import type { Node, Tombstone } from "@cascade/data";
import { type Db, type NodeRow, nodes, workspaces } from "@cascade/db";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, gt, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
	getAuth,
	getSessionUser,
	requireUser,
	type SessionUser,
} from "./auth.ts";
import { getDb } from "./db.ts";

function requireDb(): Db {
	const instance = getDb();
	if (!instance) {
		throw new Error("Sync is disabled: DATABASE_URL is not set");
	}
	return instance;
}

async function findWorkspace(db: Db, userId: string) {
	const [workspace] = await db
		.select({ id: workspaces.id, onboardedAt: workspaces.onboardedAt })
		.from(workspaces)
		.where(eq(workspaces.userId, userId));
	return workspace ?? null;
}

/** The signed-in user's workspace, created on their first push. */
async function requireWorkspace(
	db: Db,
	onboarding: { onboardedAt: Date } | null,
): Promise<string> {
	const user = await requireUser();
	return db.transaction(async (tx) => {
		const [existing] = await tx
			.select({ id: workspaces.id })
			.from(workspaces)
			.where(eq(workspaces.userId, user.id));
		if (existing) {
			if (onboarding) {
				await tx
					.update(workspaces)
					.set(onboarding)
					.where(eq(workspaces.id, existing.id));
			}
			return existing.id;
		}
		const [created] = await tx
			.insert(workspaces)
			.values({ id: crypto.randomUUID(), userId: user.id, ...onboarding })
			.onConflictDoNothing({ target: workspaces.userId })
			.returning({ id: workspaces.id });
		if (created) {
			return created.id;
		}
		const [raced] = await tx
			.select({ id: workspaces.id })
			.from(workspaces)
			.where(eq(workspaces.userId, user.id));
		if (!raced) {
			throw new Error("Could not create a workspace");
		}
		return raced.id;
	});
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
	due: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	updatedAt: z.number().int().nonnegative(),
});

const tombstoneSchema = z.object({
	id: z.string().min(1),
	deletedAt: z.number().int().nonnegative(),
});

const pushSchema = z.object({
	put: z.array(nodeSchema).max(1_000),
	delete: z.array(tombstoneSchema).max(1_000),
	onboarding: z
		.object({ completedAt: z.number().int().nonnegative() })
		.optional(),
});

const CURSOR =
	/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}(:?\d{2})?)\|[^|]+$/;

const pullSchema = z.object({
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
	onboardedAt?: number | null;
}

export interface SyncConfig {
	/** Whether this server can sync: it has a database and Google sign-in. */
	enabled: boolean;
	user: SessionUser | null;
}

export const getSyncConfig = createServerFn({ method: "GET" }).handler(
	async (): Promise<SyncConfig> => {
		const enabled = getAuth() !== null;
		return { enabled, user: enabled ? await getSessionUser() : null };
	},
);

export const pushChanges = createServerFn({ method: "POST" })
	.validator(pushSchema)
	.handler(async ({ data }) => {
		const instance = requireDb();
		const workspaceId = await requireWorkspace(
			instance,
			data.onboarding
				? { onboardedAt: new Date(data.onboarding.completedAt) }
				: null,
		);
		await instance.transaction(async (tx) => {
			for (const node of data.put) {
				await tx
					.insert(nodes)
					.values({
						workspaceId,
						id: node.id,
						parentId: node.parentId,
						order: node.order,
						content: node.content,
						collapsed: node.collapsed,
						task: node.task ?? null,
						due: node.due ?? null,
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
							due: sql`excluded.due`,
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
							eq(nodes.workspaceId, workspaceId),
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
		const user = await requireUser();
		const workspace = await findWorkspace(instance, user.id);
		const workspaceId = workspace?.id ?? null;
		const since = data.since ? decodeCursor(data.since) : null;
		if (workspaceId === null) {
			return { put: [], delete: [], cursor: data.since, known: false };
		}
		const rows = await instance
			.select()
			.from(nodes)
			.where(
				and(
					eq(nodes.workspaceId, workspaceId),
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
			response.known = true;
			response.onboardedAt = workspace?.onboardedAt?.getTime() ?? null;
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
		due: row.due ?? undefined,
		updatedAt: row.updatedAt,
	};
}
