import { sql } from "drizzle-orm";

/**
 * `WITH RECURSIVE` fragment named `chain` walking from `id` up to the root
 * via `parent_id`, scoped to `userId`. Includes the starting node itself at
 * depth 0, ordered deepest-first via `depth`.
 */
export function ancestorsOf(id: string, userId: string) {
	return sql`
		chain AS (
			SELECT id, parent_id, content, 0 AS depth FROM nodes
			WHERE id = ${id} AND user_id = ${userId}
			UNION ALL
			SELECT n.id, n.parent_id, n.content, c.depth + 1
			FROM nodes n JOIN chain c ON n.id = c.parent_id
			WHERE n.user_id = ${userId}
		)
	`;
}

/**
 * `WITH RECURSIVE` fragment named `descendants` walking every descendant of
 * `id` (not including `id` itself), scoped to `userId`.
 */
export function descendantsOf(id: string, userId: string) {
	return sql`
		descendants AS (
			SELECT id FROM nodes WHERE parent_id = ${id} AND user_id = ${userId}
			UNION ALL
			SELECT c.id FROM nodes c
			JOIN descendants d ON c.parent_id = d.id
			WHERE c.user_id = ${userId}
		)
	`;
}
