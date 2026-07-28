import { fileURLToPath } from "node:url";
import { lt } from "drizzle-orm";
import { db } from "@/db";
import { nodeDeletionReceipts } from "./persistence/node-deletion-receipt-table";

export interface PurgeDeletionReceiptsResult {
	purgedIds: string[];
}

/**
 * Deletes every deletion receipt (consumed or not) past its `expiresAt`.
 * Independent of `purge-tree-history.ts`: receipts back immediate undo for
 * every user on a short, fixed TTL, not premium's durable, longer-retention
 * history. See docs/research/535-node-deletion-lifecycle.md.
 */
export async function purgeDeletionReceipts(): Promise<PurgeDeletionReceiptsResult> {
	const purged = await db
		.delete(nodeDeletionReceipts)
		.where(lt(nodeDeletionReceipts.expiresAt, new Date()))
		.returning({ id: nodeDeletionReceipts.id });
	return { purgedIds: purged.map(({ id }) => id) };
}

async function main() {
	const { purgedIds } = await purgeDeletionReceipts();
	console.log(`Purged ${purgedIds.length} node deletion receipt(s).`);
	process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
