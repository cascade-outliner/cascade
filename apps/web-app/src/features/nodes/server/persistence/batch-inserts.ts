// Postgres caps a single query at 65535 bind parameters. Chunk size is kept
// well under that for every query below: the `nodes` insert (9 params/row),
// the `node_tags` inArray lookup and insert (1-2 params/row), and the
// eventual `node_tags` insert, so a large duplicated subtree can't blow past
// the limit and fail the whole transaction (see apps/web-app/src/db/seed-tree.ts
// for the same constraint on the interactive/perf seed inserts).
export const DUPLICATE_BATCH_SIZE = 5000;

/** Maximum rows for an insert with `parametersPerRow` bound values. */
export function postgresBatchSize(parametersPerRow: number): number {
	// Leave headroom below PostgreSQL's protocol limit instead of relying on
	// driver-specific behavior at exactly 65,535 parameters.
	return Math.floor(60_000 / parametersPerRow);
}

export function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		out.push(items.slice(i, i + size));
	}
	return out;
}
