import type { NodeSnapshot } from "../types.ts";
import { openDatabase } from "./idb.ts";

/**
 * The seam `NodeStore` persists through. The IndexedDB adapter below is one
 * implementation; tests pass an in-memory one.
 */
export interface NodePersistence {
	loadForUser(userId: string): Promise<NodeSnapshot[]>;
	loadRootIds(userId: string): Promise<string[]>;
	save(
		userId: string,
		snapshots: NodeSnapshot[],
		rootIds?: string[],
	): Promise<void>;
}

export class NodeRepository implements NodePersistence {
	async loadForUser(userId: string): Promise<NodeSnapshot[]> {
		const db = await openDatabase();
		return db.getAllFromIndex("nodes", "by-user", userId);
	}

	async loadRootIds(userId: string): Promise<string[]> {
		const db = await openDatabase();
		const record = await db.get("roots", userId);
		return record?.ids ?? [];
	}

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
