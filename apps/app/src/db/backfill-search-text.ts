import { sql } from "drizzle-orm";
import { db } from "@/db";
import { lexicalToPlainText } from "@/ui/lexical/lexical-content";

// One-off backfill for rows written before `search_text` existed. Uses raw
// SQL rather than the Drizzle query builder's `.update()` so it doesn't
// trigger `$onUpdate` and bump `updated_at`, which would corrupt the recency
// tiebreaker used by search ranking.
const BATCH_SIZE = 5000;

async function main() {
	let cursor: string | null = null;
	let done = 0;

	for (;;) {
		const rows = (await db.execute(sql`
			SELECT id, content FROM nodes
			WHERE search_text = ''
			${cursor ? sql`AND id > ${cursor}` : sql``}
			ORDER BY id
			LIMIT ${BATCH_SIZE}
		`)) as unknown as { id: string; content: unknown }[];

		if (rows.length === 0) break;

		for (const row of rows) {
			const searchText = lexicalToPlainText(row.content, 10_000);
			if (searchText === "") continue;
			await db.execute(
				sql`UPDATE nodes SET search_text = ${searchText} WHERE id = ${row.id}`,
			);
		}

		done += rows.length;
		cursor = rows[rows.length - 1]?.id ?? null;
		console.log(`backfilled: ${done}`);

		if (rows.length < BATCH_SIZE) break;
	}

	console.log(`Done. Backfilled ${done} nodes.`);
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
