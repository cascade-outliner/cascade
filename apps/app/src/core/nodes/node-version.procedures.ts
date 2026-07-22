import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { snapshotAndSetContent } from "@/core/nodes/node.procedures";
import { nodes, nodeVersions } from "@/core/nodes/node.schema";
import { requirePremium } from "@/core/premium/premium.access";
import { db } from "@/db";

/** Bounds the response size; version history isn't paginated for this pass. */
const MAX_LISTED_VERSIONS = 200;

/** Same bound as `MAX_LISTED_VERSIONS`, kept separate since this lists
 * across every node in the tree rather than one. */
const MAX_LISTED_TREE_VERSIONS = 200;

/** Version history is a premium feature (see `requirePremium`); content
 * edits are still snapshotted for every user regardless of seat status
 * (see `updateNodeContent`), so history is already there the moment
 * someone upgrades. `nodeContent` (the node's *current* content, not this
 * version's) lets the UI diff every entry against what's there now — what
 * restoring it would actually change. */
export const listNodeVersions = requirePremium
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		return await db
			.select({
				id: nodeVersions.id,
				content: nodeVersions.content,
				createdAt: nodeVersions.createdAt,
				nodeContent: nodes.content,
			})
			.from(nodeVersions)
			.innerJoin(nodes, eq(nodes.id, nodeVersions.nodeId))
			.where(
				and(
					eq(nodeVersions.nodeId, input.id),
					eq(nodeVersions.userId, context.user.id),
				),
			)
			.orderBy(desc(nodeVersions.createdAt))
			.limit(MAX_LISTED_VERSIONS);
	});

/** Every content version across the whole tree, newest first, joined with
 * each owning node's current content so the UI can link to it and show a
 * title without a second round trip. Lets a user browse and restore recent
 * edits anywhere in the tree instead of opening each node's history one at
 * a time. */
export const listTreeVersions = requirePremium.handler(async ({ context }) => {
	const userId = context.user.id;
	return await db
		.select({
			id: nodeVersions.id,
			nodeId: nodeVersions.nodeId,
			content: nodeVersions.content,
			createdAt: nodeVersions.createdAt,
			nodeContent: nodes.content,
		})
		.from(nodeVersions)
		.innerJoin(nodes, eq(nodes.id, nodeVersions.nodeId))
		.where(and(eq(nodeVersions.userId, userId), eq(nodes.userId, userId)))
		.orderBy(desc(nodeVersions.createdAt))
		.limit(MAX_LISTED_TREE_VERSIONS);
});

/**
 * Restores a node's content to a prior version. The node's current content
 * is itself snapshotted first (via `snapshotAndSetContent`), so restoring
 * becomes a normal edit in the timeline rather than destroying it.
 */
export const restoreNodeVersion = requirePremium
	.errors({
		NOT_FOUND: { status: 404, message: "Version not found" },
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		const [version] = await db
			.select({ nodeId: nodeVersions.nodeId, content: nodeVersions.content })
			.from(nodeVersions)
			.where(
				and(eq(nodeVersions.id, input.id), eq(nodeVersions.userId, userId)),
			)
			.limit(1);
		if (!version) throw errors.NOT_FOUND();

		// `restoreNodeVersion` is itself premium-gated (`requirePremium`
		// above), so the caller is always a premium user here.
		const ok = await snapshotAndSetContent(
			userId,
			version.nodeId,
			version.content,
			true,
		);
		if (!ok) throw errors.NOT_FOUND();

		const [updated] = await db
			.select({ id: nodes.id, content: nodes.content })
			.from(nodes)
			.where(and(eq(nodes.id, version.nodeId), eq(nodes.userId, userId)))
			.limit(1);
		if (!updated) throw errors.NOT_FOUND();
		return updated;
	});
