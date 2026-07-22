import type { NodeTypeName } from "@cascade/outliner/node-types";
import { and, desc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
	restoreDeletedSubtree,
	snapshotAndSetContent,
} from "@/core/nodes/node.procedures";
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
 * restoring it would actually change. `nodeDeletedAt` is set when the
 * owning node is currently (soft-)deleted (see `deleteNode`) — its
 * `node_versions` rows survive a delete on purpose, so its history (and the
 * ability to restore it, undeleting the whole subtree — see
 * `restoreNodeVersion`) isn't lost along with it.
 *
 * The `created` marker (see the schema) is excluded: it's not a content
 * state this node ever had, just the moment it came into being, which
 * isn't useful in a *content* history for one specific node the way it is
 * in `listTreeVersions`' timeline of everything that's happened. */
export const listNodeVersions = requirePremium
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		return await db
			.select({
				id: nodeVersions.id,
				content: nodeVersions.content,
				createdAt: nodeVersions.createdAt,
				nodeContent: nodes.content,
				nodeDeletedAt: nodes.deletedAt,
				descendantsDeleted: nodeVersions.descendantsDeleted,
			})
			.from(nodeVersions)
			.innerJoin(nodes, eq(nodes.id, nodeVersions.nodeId))
			.where(
				and(
					eq(nodeVersions.nodeId, input.id),
					eq(nodeVersions.userId, context.user.id),
					eq(nodeVersions.created, false),
				),
			)
			.orderBy(desc(nodeVersions.createdAt))
			.limit(MAX_LISTED_VERSIONS);
	});

/** Every content version across the whole tree, newest first, joined with
 * each owning node's current content so the UI can link to it and show a
 * title without a second round trip. Lets a user browse and restore recent
 * edits anywhere in the tree instead of opening each node's history one at
 * a time — including versions belonging to a deleted node (see
 * `nodeDeletedAt` on `listNodeVersions`), so deleting a node doesn't take
 * its history down with it.
 *
 * Unlike `listNodeVersions`, this includes the `created` marker `createNode`
 * writes (see the schema) — a brand new, never-edited node still shows up
 * here immediately as "created", rather than being invisible until its
 * first edit.
 *
 * A deleted node's *other* (non-marker, non-`created`) versions are
 * excluded here: once a node is gone, its individual edit history is no
 * longer the useful signal at the tree level — only the single
 * `descendantsDeleted` marker row `deleteNode` wrote for it is, so a whole
 * subtree deletion shows up as one entry instead of one per node that was
 * in it. The `created` marker keeps showing regardless — a node being
 * deleted later doesn't erase the record of when it came into being.
 * (`listNodeVersions`, for a specific node's own history, keeps every
 * ordinary version — deleted or not.) */
export const listTreeVersions = requirePremium.handler(async ({ context }) => {
	const userId = context.user.id;
	return await db
		.select({
			id: nodeVersions.id,
			nodeId: nodeVersions.nodeId,
			content: nodeVersions.content,
			createdAt: nodeVersions.createdAt,
			nodeContent: nodes.content,
			nodeDeletedAt: nodes.deletedAt,
			descendantsDeleted: nodeVersions.descendantsDeleted,
			created: nodeVersions.created,
		})
		.from(nodeVersions)
		.innerJoin(nodes, eq(nodes.id, nodeVersions.nodeId))
		.where(
			and(
				eq(nodeVersions.userId, userId),
				eq(nodes.userId, userId),
				or(
					isNull(nodes.deletedAt),
					isNotNull(nodeVersions.descendantsDeleted),
					eq(nodeVersions.created, true),
				),
			),
		)
		.orderBy(desc(nodeVersions.createdAt))
		.limit(MAX_LISTED_TREE_VERSIONS);
});

/**
 * Restores a node's content to a prior version. The node's current content
 * is itself snapshotted first (via `snapshotAndSetContent`), so restoring
 * becomes a normal edit in the timeline rather than destroying it.
 *
 * If the node is currently deleted, this first brings back its whole
 * subtree (see `restoreDeletedSubtree`) — otherwise there'd be no way to
 * restore a version belonging to a node you can no longer see or reach.
 *
 * A `descendantsDeleted` marker row (see the schema) isn't a content edit —
 * `deleteNode` never touched the node's `content` — so restoring one only
 * undeletes the subtree and skips `snapshotAndSetContent` entirely, leaving
 * content exactly as it was. A `created` marker isn't restorable at all
 * (the UI disables Restore for it) — this is a defensive no-op against a
 * direct API call, since "restoring" the moment a node came into being
 * doesn't mean anything.
 */
export const restoreNodeVersion = requirePremium
	.errors({
		NOT_FOUND: { status: 404, message: "Version not found" },
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		const [version] = await db
			.select({
				nodeId: nodeVersions.nodeId,
				content: nodeVersions.content,
				descendantsDeleted: nodeVersions.descendantsDeleted,
				created: nodeVersions.created,
			})
			.from(nodeVersions)
			.where(
				and(eq(nodeVersions.id, input.id), eq(nodeVersions.userId, userId)),
			)
			.limit(1);
		if (!version) throw errors.NOT_FOUND();

		await restoreDeletedSubtree(userId, version.nodeId);

		// `restoreNodeVersion` is itself premium-gated (`requirePremium`
		// above), so the caller is always a premium user here.
		if (version.descendantsDeleted === null && !version.created) {
			const ok = await snapshotAndSetContent(
				userId,
				version.nodeId,
				version.content,
				true,
			);
			if (!ok) throw errors.NOT_FOUND();
		}

		const [updated] = await db
			.select({ id: nodes.id, content: nodes.content })
			.from(nodes)
			.where(and(eq(nodes.id, version.nodeId), eq(nodes.userId, userId)))
			.limit(1);
		if (!updated) throw errors.NOT_FOUND();
		return updated;
	});

export interface DeletedSubtreePreviewRow {
	id: string;
	content: unknown;
	type: NodeTypeName;
	depth: number;
}

/**
 * A flat, depth-first snapshot of a deleted node's subtree exactly as it
 * stood at delete time — used to preview a `descendantsDeleted` version
 * history marker (see the schema) as it actually looked in the outliner,
 * instead of a content diff (deletion never changed any node's `content`,
 * so there'd be nothing to diff). Deleted rows stay in place until
 * `purge-deleted-nodes.ts` is next run, so their real `content`/`type`/
 * `parentId`/`order` are still there to read directly — nothing needs to
 * have been snapshotted specifically for this.
 *
 * Rejects with NOT_FOUND unless `nodeId` is owned by the caller and
 * currently deleted, so this can't be used as a side door to preview an
 * unrelated *active* node's subtree.
 */
export const getDeletedSubtreePreview = requirePremium
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ nodeId: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		const [target] = await db
			.select({ deletedAt: nodes.deletedAt })
			.from(nodes)
			.where(and(eq(nodes.id, input.nodeId), eq(nodes.userId, userId)))
			.limit(1);
		if (!target || target.deletedAt === null) throw errors.NOT_FOUND();

		const rows = (await db.execute(sql`
			WITH RECURSIVE subtree AS (
				SELECT id, content, type, 0 AS depth, ARRAY["order"] AS path
				FROM nodes WHERE id = ${input.nodeId} AND user_id = ${userId}
				UNION ALL
				SELECT c.id, c.content, c.type, s.depth + 1, s.path || c."order"
				FROM nodes c
				JOIN subtree s ON c.parent_id = s.id
				WHERE c.user_id = ${userId}
			)
			SELECT id, content, type, depth FROM subtree ORDER BY path
		`)) as unknown as {
			id: string;
			content: unknown;
			type: NodeTypeName;
			depth: number;
		}[];

		return rows.map(
			(row): DeletedSubtreePreviewRow => ({
				id: row.id,
				content: row.content,
				type: row.type,
				depth: Number(row.depth),
			}),
		);
	});
