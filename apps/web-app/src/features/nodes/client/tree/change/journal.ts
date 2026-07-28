import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import type { VisibleTreeData } from "../tree-data.types";
import type { PendingChange } from "./ports";
import type { ChangeId } from "./types";

/**
 * `base` plus every still-pending optimistic projection, replayed in
 * command order on every read. Folding a success into `base` (`resolve`) or
 * discarding a failure (`reject`) only ever removes the one entry it names —
 * a whole snapshot never overwrites work appended after it, so a failure
 * can't erase a later optimistic change and an authoritative refresh always
 * replays whatever is still pending on top of it.
 */
export class ChangeJournal {
	private base: VisibleTreeData;
	private pending: PendingChange[] = [];

	constructor(base: VisibleTreeData) {
		this.base = base;
	}

	getBase(): VisibleTreeData {
		return this.base;
	}

	getRows(): VisibleNodeRow[] {
		return this.pending.reduce(
			(rows, entry) => entry.project(rows),
			this.base.rows,
		);
	}

	add(entry: PendingChange): void {
		this.pending = [...this.pending, entry];
	}

	resolve(
		id: ChangeId,
		updateBase: (base: VisibleTreeData) => VisibleTreeData,
	): void {
		this.base = updateBase(this.base);
		this.pending = this.pending.filter((entry) => entry.id !== id);
	}

	reject(id: ChangeId, refreshedBase?: VisibleTreeData): void {
		if (refreshedBase) this.base = refreshedBase;
		this.pending = this.pending.filter((entry) => entry.id !== id);
	}
}
