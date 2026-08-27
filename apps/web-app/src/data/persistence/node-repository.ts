import type { NodeSnapshot } from "../types.ts";
import { openDatabase } from "./idb.ts";

/**
 * Reads and writes whole `NodeSnapshot`s. Deliberately dumb: it knows nothing
 * about trees, so a future sync engine can reuse it to land server deltas.
 */
export class NodeRepository {
	/** Every node belonging to `userId`, tombstones included. */
	async loadForUser(userId: string): Promise<NodeSnapshot[]> {
		const db = await openDatabase();
		return db.getAllFromIndex("nodes", "by-user", userId);
	}

	async loadRootIds(userId: string): Promise<string[]> {
		const db = await openDatabase();
		const record = await db.get("roots", userId);
		return record?.ids ?? [];
	}

	/**
	 * Writes snapshots, and optionally the root order, in a single transaction so
	 * a partial write cannot land.
	 */
	async save(
		userId: string,
		snapshots: NodeSnapshot[],
		rootIds?: string[],
	): Promise<void> {
		if (snapshots.length === 0 && !rootIds) {
			return;
		}

		const db = await openDatabase();
		const tx = db.transaction(["nodes", "roots"], "readwrite");
		const writes: Promise<unknown>[] = snapshots.map((snapshot) =>
			tx.objectStore("nodes").put(snapshot),
		);

		if (rootIds) {
			writes.push(tx.objectStore("roots").put({ userId, ids: rootIds }));
		}

		await Promise.all([...writes, tx.done]);
	}
}
