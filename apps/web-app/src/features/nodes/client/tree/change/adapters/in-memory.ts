import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import {
	appendRow,
	insertRowAfter,
	insertSubtreeAt,
	moveSubtree,
	patchRow,
	removeSubtree,
	subtreeRange,
} from "@cascade/outliner/visible-rows";
import type { VisibleTreeData } from "../../tree-data.types";
import { ChangeJournal } from "../journal";
import type {
	CreatedNode,
	HistoryEntry,
	PendingChange,
	TreeHistory,
	TreeMotion,
	TreeRemote,
	TreeViewStore,
} from "../ports";
import type {
	ChangeId,
	ChangeOutcome,
	InvalidationEffects,
	TreeCommand,
} from "../types";

function toCreatedNode(row: VisibleNodeRow): CreatedNode {
	return {
		id: row.id,
		parentId: row.parentId,
		content: row.content,
		type: row.type,
		metadata: row.metadata,
		expanded: row.expanded,
		order: row.order,
		dueDate: row.dueDate,
		recurrence: row.recurrence ?? null,
		tags: row.tags,
		hasChildren: row.hasChildren,
	};
}

/**
 * A deterministic, in-process stand-in for the oRPC nodes router: mutates a
 * flat row array the same way the real server would, so interface tests can
 * exercise move/remove/restore/create ordering without a database. Not a
 * faithful pagination model — `fetchWindow` always returns the full backing
 * set — since these tests care about journal/queue/motion/history mechanics,
 * not server-side DFS pagination (covered separately at the procedure level).
 */
export function createInMemoryTreeRemote(seed: VisibleNodeRow[]): TreeRemote {
	let serverRows: VisibleNodeRow[] = seed.map((row) => ({ ...row }));
	let nextId = 1;

	return {
		async toggleExpanded(id, expanded) {
			serverRows = patchRow(serverRows, id, { expanded });
		},
		async fetchSubtree(id) {
			const range = subtreeRange(serverRows, id);
			return range ? serverRows.slice(range.start + 1, range.end) : [];
		},
		async move(id, target) {
			serverRows = moveSubtree(serverRows, id, target);
		},
		async remove(id) {
			const range = subtreeRange(serverRows, id);
			const childrenDeleted = range ? range.end - range.start - 1 : 0;
			serverRows = removeSubtree(serverRows, id);
			return { childrenDeleted };
		},
		async restore(receipt) {
			serverRows = insertSubtreeAt(
				serverRows,
				receipt.row,
				receipt.descendants,
				receipt.target,
			);
		},
		async create(placement, options) {
			const id = `generated-${nextId++}`;
			const row: VisibleNodeRow = {
				id,
				parentId: placement.parentId,
				content: null,
				type: options?.initialType?.type ?? "text",
				metadata: options?.initialType?.metadata ?? null,
				expanded: true,
				order: id,
				dueDate: options?.dueDate ?? null,
				recurrence: null,
				tags: options?.tags ?? [],
				depth: 0,
				path: [id],
				hasChildren: false,
				isLastChild: true,
			};
			serverRows =
				placement.position === "append"
					? appendRow(serverRows, row)
					: insertRowAfter(serverRows, placement.afterId, row);
			return toCreatedNode(row);
		},
		async duplicate(id) {
			const source = serverRows.find((row) => row.id === id);
			if (!source) throw new Error(`Node ${id} not found`);
			const clone: VisibleNodeRow = {
				...source,
				id: `generated-${nextId++}`,
				order: `${source.order}-copy`,
				hasChildren: false,
			};
			serverRows = insertRowAfter(serverRows, id, clone);
			return toCreatedNode(clone);
		},
		async updateContent(id, content) {
			serverRows = patchRow(serverRows, id, { content });
		},
		async setType(id, typed) {
			serverRows = patchRow(serverRows, id, {
				type: typed.type,
				metadata: typed.metadata,
			});
		},
		async setDueDate(id, dueDate) {
			serverRows = patchRow(serverRows, id, { dueDate });
		},
		async setRecurrence(id, recurrence) {
			serverRows = serverRows.map((row) =>
				row.id === id
					? {
							...row,
							recurrence: recurrence ? { ...recurrence, anchorDay: 1 } : null,
						}
					: row,
			);
		},
		async setTags(id, tags) {
			serverRows = patchRow(serverRows, id, { tags });
		},
		async setTaskCompleted(id, completed) {
			serverRows = serverRows.map((row) =>
				row.id === id ? { ...row, metadata: { completed } } : row,
			);
			return { advanced: false, nextDueDate: null };
		},
		async fetchWindow() {
			return { rows: serverRows.map((row) => ({ ...row })), nextCursor: null };
		},
		async fetchNextPage() {
			return { rows: [], nextCursor: null };
		},
	};
}

export interface InMemoryTreeViewStore extends TreeViewStore {
	/** Every published projection, in order — one per `addPending`/`resolve`/`reject` call. */
	snapshots(): VisibleNodeRow[][];
	invalidations(): InvalidationEffects[];
	cancelCount(): number;
}

export function createInMemoryTreeViewStore(
	initial: VisibleTreeData,
): InMemoryTreeViewStore {
	const journal = new ChangeJournal(initial);
	const snaps: VisibleNodeRow[][] = [];
	const invalidationLog: InvalidationEffects[] = [];
	let cancels = 0;

	const publish = () => snaps.push(journal.getRows());

	return {
		cancelActiveReads: async () => {
			cancels += 1;
		},
		getBase: () => journal.getBase(),
		getRows: () => journal.getRows(),
		addPending: (entry: PendingChange) => {
			journal.add(entry);
			publish();
		},
		resolve: (id: ChangeId, updateBase) => {
			journal.resolve(id, updateBase);
			publish();
		},
		reject: (id: ChangeId, refreshedBase) => {
			journal.reject(id, refreshedBase);
			publish();
		},
		invalidate: (effects) => {
			invalidationLog.push(effects);
		},
		snapshots: () => snaps,
		invalidations: () => invalidationLog,
		cancelCount: () => cancels,
	};
}

export interface MotionCall {
	phase: "before" | "after";
	command: TreeCommand;
	outcome?: ChangeOutcome;
}

export interface RecordingTreeMotion extends TreeMotion {
	calls(): MotionCall[];
}

/** `throwOn` lets a test simulate a motion adapter that fails on a chosen call, to prove isolation from the semantic outcome. */
export function createRecordingTreeMotion(
	options: {
		throwOn?: (command: TreeCommand, phase: "before" | "after") => boolean;
	} = {},
): RecordingTreeMotion {
	const calls: MotionCall[] = [];
	return {
		before(command) {
			calls.push({ phase: "before", command });
			if (options.throwOn?.(command, "before"))
				throw new Error("motion before failed");
		},
		after(command, outcome) {
			calls.push({ phase: "after", command, outcome });
			if (options.throwOn?.(command, "after"))
				throw new Error("motion after failed");
		},
		calls: () => calls,
	};
}

export interface RecordingTreeHistory extends TreeHistory {
	entries(): HistoryEntry[];
}

export function createRecordingTreeHistory(): RecordingTreeHistory {
	const entries: HistoryEntry[] = [];
	return {
		push: (entry) => {
			entries.push(entry);
		},
		entries: () => entries,
	};
}
