import { formatExport } from "@cascade/outliner/export-format";
import { lexicalToPlainText } from "@cascade/outliner/lexical-content";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import { authed } from "@/orpc/context";

interface ExportSqlRow {
	content: unknown;
	path: string[];
}

/**
 * Serializes a node's full subtree (or, with `rootId: null`, every top-level
 * node the user owns) to Markdown or OPML. Unlike `visibleTree`, this walks
 * every descendant regardless of expanded/collapsed state and isn't
 * paginated — exports are expected to be read once and downloaded whole.
 */
export const exportTree = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(
		z.object({
			rootId: z.string().nullable(),
			format: z.enum(["markdown", "opml"]),
		}),
	)
	.handler(async ({ input, context, errors }) => {
		const { rootId, format } = input;
		const userId = context.user.id;

		if (rootId !== null) {
			const [root] = await db
				.select({ id: nodes.id })
				.from(nodes)
				.where(and(eq(nodes.id, rootId), eq(nodes.userId, userId)))
				.limit(1);
			if (!root) throw errors.NOT_FOUND();
		}

		const rows = (await db.execute(sql`
			WITH RECURSIVE subtree AS (
				SELECT id, content, ARRAY["order"] AS path
				FROM nodes
				WHERE user_id = ${userId}
					AND ${rootId === null ? sql`parent_id IS NULL` : sql`id = ${rootId}`}
				UNION ALL
				SELECT c.id, c.content, s.path || c."order"
				FROM nodes c
				JOIN subtree s ON c.parent_id = s.id
				WHERE c.user_id = ${userId}
			)
			SELECT content, path FROM subtree ORDER BY path
		`)) as unknown as ExportSqlRow[];

		const content = formatExport(
			rows.map((row) => ({
				depth: row.path.length - 1,
				text: lexicalToPlainText(row.content, Number.MAX_SAFE_INTEGER),
			})),
			format,
		);

		return { content };
	});
