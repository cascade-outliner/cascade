import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { snapshotAndSetContent } from "@/core/nodes/node.procedures";
import { nodes, nodeVersions } from "@/core/nodes/node.schema";
import { db } from "@/db";
import { authed } from "@/orpc/context";

/** Bounds the response size; version history isn't paginated for this pass. */
const MAX_LISTED_VERSIONS = 200;

export const listNodeVersions = authed
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		return await db
			.select({
				id: nodeVersions.id,
				content: nodeVersions.content,
				createdAt: nodeVersions.createdAt,
			})
			.from(nodeVersions)
			.where(
				and(
					eq(nodeVersions.nodeId, input.id),
					eq(nodeVersions.userId, context.user.id),
				),
			)
			.orderBy(desc(nodeVersions.createdAt))
			.limit(MAX_LISTED_VERSIONS);
	});

/**
 * Restores a node's content to a prior version. The node's current content
 * is itself snapshotted first (via `snapshotAndSetContent`), so restoring
 * becomes a normal edit in the timeline rather than destroying it.
 */
export const restoreNodeVersion = authed
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

		const ok = await snapshotAndSetContent(
			userId,
			version.nodeId,
			version.content,
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
