import { user } from "@cascade/auth/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import { generateShareToken } from "@/features/sharing/model/share-token";
import { fetchSharedSubtree } from "@/features/sharing/server/persistence/shared-subtree-cte";
import { treeShares } from "@/features/sharing/server/share-table";
import { authed, base } from "@/orpc/context";

export interface TreeShareSummary {
	id: string;
	nodeId: string;
	token: string;
	requireLogin: boolean;
	createdAt: Date;
	revokedAt: Date | null;
}

export const createShare = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(
		z.object({
			nodeId: z.string(),
			requireLogin: z.boolean().default(false),
		}),
	)
	.handler(async ({ input, context, errors }): Promise<TreeShareSummary> => {
		const [node] = await db
			.select({ id: nodes.id })
			.from(nodes)
			.where(and(eq(nodes.id, input.nodeId), eq(nodes.userId, context.user.id)))
			.limit(1);
		if (!node) throw errors.NOT_FOUND();

		const [share] = await db
			.insert(treeShares)
			.values({
				nodeId: input.nodeId,
				ownerId: context.user.id,
				token: generateShareToken(),
				requireLogin: input.requireLogin,
			})
			.returning();
		if (!share) throw new Error("Failed to create share");
		return share;
	});

export const revokeShare = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Share not found" },
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const [revoked] = await db
			.update(treeShares)
			.set({ revokedAt: new Date() })
			.where(
				and(
					eq(treeShares.id, input.id),
					eq(treeShares.ownerId, context.user.id),
					isNull(treeShares.revokedAt),
				),
			)
			.returning({ id: treeShares.id });
		if (!revoked) throw errors.NOT_FOUND();
		return { revoked: true };
	});

export const listShares = authed
	.input(z.object({ nodeId: z.string().optional() }))
	.handler(async ({ input, context }): Promise<TreeShareSummary[]> => {
		return db
			.select()
			.from(treeShares)
			.where(
				and(
					eq(treeShares.ownerId, context.user.id),
					input.nodeId ? eq(treeShares.nodeId, input.nodeId) : undefined,
				),
			)
			.orderBy(desc(treeShares.createdAt));
	});

export interface SharedTreePage {
	ownerName: string;
	rootId: string;
	rows: Awaited<ReturnType<typeof fetchSharedSubtree>>["rows"];
	nextCursor: string[] | null;
}

/**
 * Public, unauthenticated read of a shared subtree. The share token is the
 * trust boundary here, not the caller's session — this deliberately builds
 * off `base`, not `authed`, since a link can be shared without requiring
 * login. `requireLogin` shares still need *some* session, just not one tied
 * to a specific invited user (no per-recipient allowlist in this iteration).
 */
export const getSharedTree = base
	.errors({
		NOT_FOUND: { status: 404, message: "Share not found" },
		GONE: { status: 410, message: "This share link has been revoked" },
		UNAUTHORIZED: { status: 401, message: "Sign in to view this share" },
	})
	.input(
		z.object({
			token: z.string(),
			cursor: z.array(z.string()).nullable().default(null),
			limit: z.number().int().min(1).max(2000).default(500),
		}),
	)
	.handler(async ({ input, context, errors }): Promise<SharedTreePage> => {
		const [share] = await db
			.select()
			.from(treeShares)
			.where(eq(treeShares.token, input.token))
			.limit(1);
		if (!share) throw errors.NOT_FOUND();
		if (share.revokedAt) throw errors.GONE();
		if (share.requireLogin && !context.session) throw errors.UNAUTHORIZED();

		const [owner] = await db
			.select({ name: user.name })
			.from(user)
			.where(eq(user.id, share.ownerId))
			.limit(1);
		if (!owner) throw errors.NOT_FOUND();

		const { rows, nextCursor } = await fetchSharedSubtree({
			ownerId: share.ownerId,
			rootId: share.nodeId,
			cursor: input.cursor,
			limit: input.limit,
		});
		if (rows.length === 0 && input.cursor === null) throw errors.NOT_FOUND();

		return { ownerName: owner.name, rootId: share.nodeId, rows, nextCursor };
	});
