import { fileURLToPath } from "node:url";
import { lt } from "drizzle-orm";
import { db } from "../../../db";
import { treeHistoryEvents } from "./tree-history-table";

export interface PurgeTreeHistoryResult {
	purgedIds: string[];
}

export async function purgeTreeHistory(
	days = 30,
	dryRun = false,
): Promise<PurgeTreeHistoryResult> {
	if (!Number.isInteger(days) || days < 0) {
		throw new Error("--days must be a non-negative integer");
	}
	const before = new Date(Date.now() - days * 86_400_000);
	const condition = lt(treeHistoryEvents.createdAt, before);

	if (dryRun) {
		const matches = await db
			.select({ id: treeHistoryEvents.id })
			.from(treeHistoryEvents)
			.where(condition);
		return { purgedIds: matches.map(({ id }) => id) };
	}

	const purged = await db
		.delete(treeHistoryEvents)
		.where(condition)
		.returning({ id: treeHistoryEvents.id });
	return { purgedIds: purged.map(({ id }) => id) };
}

function parseDays(): number {
	const value = process.argv
		.find((arg) => arg.startsWith("--days="))
		?.slice("--days=".length);
	return value === undefined ? 30 : Number(value);
}

async function main() {
	const dryRun = process.argv.includes("--dry-run");
	const days = parseDays();
	const { purgedIds } = await purgeTreeHistory(days, dryRun);
	const prefix = dryRun ? "[dry run] Would purge" : "Purged";
	console.log(`${prefix} ${purgedIds.length} tree history event(s).`);
	process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
