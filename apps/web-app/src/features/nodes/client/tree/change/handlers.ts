import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { nextRecurringDueDate } from "@cascade/outliner/recurrence";
import {
	captureCurrentPosition,
	collapseNode,
	expandNode,
	insertSubtreeAt,
	type MoveTarget,
	moveSubtree,
	patchRow,
	removeSubtree,
} from "@cascade/outliner/visible-rows";
import type { VisibleTreeData } from "../tree-data.types";
import type { CreatedNode, TreeRemote, TreeViewStore } from "./ports";
import type {
	ChangeError,
	InvalidationEffects,
	InvertedCommands,
	TreeCommand,
	TreeCommandKind,
} from "./types";

export interface HandlerContext {
	rows: VisibleNodeRow[];
	base: VisibleTreeData;
	remote: TreeRemote;
}

/**
 * How a structural command's success/failure folds into `TreeViewStore`'s
 * authoritative `base`:
 * - `windowRefresh` refetches the loaded window; required whenever the
 *   command can leave a row's fractional `order`/`path` stale (move) or
 *   change membership across the loaded page boundary (remove/restore/
 *   create/duplicate).
 * - `foldProject` reapplies the same transform used for the optimistic
 *   projection directly to `base`, skipping a redundant round trip when the
 *   optimistic projection was already built from authoritative data
 *   (toggle's expand fetch).
 * - `appendPage` is `loadMore`'s own page-append reconciliation.
 */
export type StructuralReconciliation =
	| "windowRefresh"
	| "foldProject"
	| "appendPage";

export interface CommandHandler<C extends TreeCommand, Captured, Result> {
	structural: boolean;
	reconciliation?: StructuralReconciliation;
	/** Non-structural commands only: groups same-field writes for remote sequencing. */
	fieldKey?: (command: C) => string;
	validate?: (command: C, ctx: HandlerContext) => ChangeError | null;
	capture: (command: C, ctx: HandlerContext) => Captured | Promise<Captured>;
	project: (
		command: C,
		rows: VisibleNodeRow[],
		captured: Captured,
	) => VisibleNodeRow[];
	run: (command: C, remote: TreeRemote, captured: Captured) => Promise<Result>;
	/** Called only after semantic success, with `store` reflecting the just-reconciled state. */
	invert: (
		command: C,
		captured: Captured,
		result: Result,
		store: TreeViewStore,
	) => InvertedCommands | null;
	invalidation: (command: C, result: Result) => InvalidationEffects;
}

// biome-ignore lint/suspicious/noExplicitAny: the registry below is keyed by kind, which already narrows each entry at its definition site.
export type AnyCommandHandler = CommandHandler<TreeCommand, any, any>;

function defineHandler<C extends TreeCommand, Captured, Result>(
	handler: CommandHandler<C, Captured, Result>,
): AnyCommandHandler {
	return handler as unknown as AnyCommandHandler;
}

function requireRow(rows: VisibleNodeRow[], id: string): ChangeError | null {
	return rows.some((row) => row.id === id)
		? null
		: { kind: "validation", message: `Node ${id} is not in the visible tree.` };
}

function placementToTarget(
	placement: Extract<TreeCommand, { kind: "create" }>["placement"],
): MoveTarget {
	return placement.position === "append"
		? { position: "append", parentId: placement.parentId }
		: {
				position: "after",
				targetId: placement.afterId,
				parentId: placement.parentId,
			};
}

export function dedupeAppend(
	rows: VisibleNodeRow[],
	page: VisibleNodeRow[],
): VisibleNodeRow[] {
	const seen = new Set(rows.map((row) => row.id));
	return [...rows, ...page.filter((row) => !seen.has(row.id))];
}

const toggleHandler = defineHandler<
	Extract<TreeCommand, { kind: "toggle" }>,
	{ subtree: VisibleNodeRow[] },
	void
>({
	structural: true,
	reconciliation: "foldProject",
	validate: (command, ctx) => requireRow(ctx.rows, command.id),
	capture: async (command, ctx) => ({
		subtree: command.expanded ? await ctx.remote.fetchSubtree(command.id) : [],
	}),
	project: (command, rows, captured) =>
		command.expanded
			? expandNode(rows, command.id, captured.subtree)
			: collapseNode(rows, command.id),
	run: (command, remote) => remote.toggleExpanded(command.id, command.expanded),
	invert: () => null,
	invalidation: () => ({}),
});

const moveHandler = defineHandler<
	Extract<TreeCommand, { kind: "move" }>,
	{ previousTarget: MoveTarget | null },
	void
>({
	structural: true,
	reconciliation: "windowRefresh",
	validate: (command, ctx) => requireRow(ctx.rows, command.id),
	capture: (command, ctx) => ({
		previousTarget: captureCurrentPosition(ctx.rows, command.id),
	}),
	project: (command, rows) => {
		const expanded = command.expandParentId
			? patchRow(rows, command.expandParentId, { expanded: true })
			: rows;
		return moveSubtree(expanded, command.id, command.target);
	},
	run: async (command, remote) => {
		await Promise.all([
			remote.move(command.id, command.target),
			command.expandParentId
				? remote.toggleExpanded(command.expandParentId, true)
				: Promise.resolve(),
		]);
	},
	invert: (command, captured) =>
		captured.previousTarget
			? {
					undo: {
						kind: "move",
						id: command.id,
						target: captured.previousTarget,
					},
					redo: command,
				}
			: null,
	invalidation: () => ({}),
});

interface RemoveCaptured {
	row: VisibleNodeRow;
	descendants: VisibleNodeRow[];
	target: MoveTarget;
}

const removeHandler = defineHandler<
	Extract<TreeCommand, { kind: "remove" }>,
	RemoveCaptured | null,
	{ childrenDeleted: number } | null
>({
	structural: true,
	reconciliation: "windowRefresh",
	validate: (command, ctx) => requireRow(ctx.rows, command.id),
	capture: async (command, ctx) => {
		const row = ctx.rows.find((candidate) => candidate.id === command.id);
		const target = row && captureCurrentPosition(ctx.rows, command.id);
		if (!row || !target) return null;
		const descendants = row.hasChildren
			? await ctx.remote.fetchSubtree(command.id, {
					includeCollapsedDescendants: true,
				})
			: [];
		return { row, descendants, target };
	},
	project: (command, rows, captured) =>
		captured ? removeSubtree(rows, command.id) : rows,
	run: (command, remote, captured) =>
		captured ? remote.remove(command.id) : Promise.resolve(null),
	invert: (command, captured) =>
		captured
			? {
					undo: { kind: "restore", deletion: captured },
					redo: { kind: "remove", id: command.id },
				}
			: null,
	invalidation: () => ({}),
});

const restoreHandler = defineHandler<
	Extract<TreeCommand, { kind: "restore" }>,
	void,
	void
>({
	structural: true,
	reconciliation: "windowRefresh",
	capture: () => undefined,
	project: (command, rows) =>
		insertSubtreeAt(
			rows,
			command.deletion.row,
			command.deletion.descendants,
			command.deletion.target,
		),
	run: (command, remote) => remote.restore(command.deletion),
	invert: (command) => ({
		undo: { kind: "remove", id: command.deletion.row.id },
		redo: command,
	}),
	invalidation: () => ({}),
});

const createHandler = defineHandler<
	Extract<TreeCommand, { kind: "create" }>,
	{ target: MoveTarget },
	CreatedNode
>({
	structural: true,
	reconciliation: "windowRefresh",
	validate: (command, ctx) =>
		command.placement.position === "after"
			? requireRow(ctx.rows, command.placement.afterId)
			: null,
	capture: (command) => ({ target: placementToTarget(command.placement) }),
	project: (_command, rows) => rows,
	run: (command, remote) =>
		remote.create(command.placement, {
			initialType: command.options?.initialType,
			dueDate: command.options?.dueDate
				? formatCalendarDate(command.options.dueDate)
				: null,
			tags: command.options?.tags,
		}),
	invert: (_command, captured, result, store) => {
		const assembled = store.getRows().find((row) => row.id === result.id);
		if (!assembled) return null;
		return {
			undo: { kind: "remove", id: result.id },
			redo: {
				kind: "restore",
				deletion: { row: assembled, descendants: [], target: captured.target },
			},
		};
	},
	invalidation: () => ({}),
});

const duplicateHandler = defineHandler<
	Extract<TreeCommand, { kind: "duplicate" }>,
	void,
	CreatedNode
>({
	structural: true,
	reconciliation: "windowRefresh",
	validate: (command, ctx) => requireRow(ctx.rows, command.id),
	capture: () => undefined,
	project: (_command, rows) => rows,
	run: (command, remote) => remote.duplicate(command.id),
	invert: () => null,
	invalidation: () => ({}),
});

const updateContentHandler = defineHandler<
	Extract<TreeCommand, { kind: "updateContent" }>,
	{ previous: { root: unknown } | null },
	void
>({
	structural: false,
	fieldKey: (command) => `${command.id}:content`,
	validate: (command, ctx) => requireRow(ctx.rows, command.id),
	capture: (command, ctx) => ({
		previous:
			(ctx.rows.find((row) => row.id === command.id)?.content as {
				root: unknown;
			} | null) ?? null,
	}),
	project: (command, rows) =>
		patchRow(rows, command.id, { content: command.content }),
	run: (command, remote) => remote.updateContent(command.id, command.content),
	invert: (command, captured) => ({
		undo: { kind: "updateContent", id: command.id, content: captured.previous },
		redo: command,
	}),
	invalidation: (command) => ({ ancestorsOf: command.id }),
});

const setTypeHandler = defineHandler<
	Extract<TreeCommand, { kind: "setType" }>,
	void,
	void
>({
	structural: false,
	fieldKey: (command) => `${command.id}:type`,
	validate: (command, ctx) => requireRow(ctx.rows, command.id),
	capture: () => undefined,
	project: (command, rows) =>
		patchRow(rows, command.id, {
			type: command.typed.type,
			metadata: command.typed.metadata,
			...(command.typed.type === "text" ? { recurrence: null } : {}),
		}),
	run: (command, remote) => remote.setType(command.id, command.typed),
	invert: () => null,
	invalidation: () => ({}),
});

const setDueDateHandler = defineHandler<
	Extract<TreeCommand, { kind: "setDueDate" }>,
	{ previous: string | null },
	void
>({
	structural: false,
	fieldKey: (command) => `${command.id}:dueDate`,
	validate: (command, ctx) => requireRow(ctx.rows, command.id),
	capture: (command, ctx) => ({
		previous: ctx.rows.find((row) => row.id === command.id)?.dueDate ?? null,
	}),
	project: (command, rows) =>
		rows.map((row) =>
			row.id === command.id
				? {
						...row,
						dueDate: command.dueDate,
						recurrence:
							command.dueDate && row.recurrence
								? {
										...row.recurrence,
										anchorDay: Number(command.dueDate.slice(8, 10)),
									}
								: null,
					}
				: row,
		),
	run: (command, remote) => remote.setDueDate(command.id, command.dueDate),
	invert: (command, captured) => ({
		undo: { kind: "setDueDate", id: command.id, dueDate: captured.previous },
		redo: command,
	}),
	invalidation: () => ({ family: true }),
});

const setRecurrenceHandler = defineHandler<
	Extract<TreeCommand, { kind: "setRecurrence" }>,
	void,
	void
>({
	structural: false,
	fieldKey: (command) => `${command.id}:recurrence`,
	validate: (command, ctx) => requireRow(ctx.rows, command.id),
	capture: () => undefined,
	project: (command, rows) =>
		rows.map((row) =>
			row.id === command.id
				? {
						...row,
						recurrence:
							command.recurrence && row.dueDate
								? {
										...command.recurrence,
										anchorDay: Number(row.dueDate.slice(8, 10)),
									}
								: null,
						metadata:
							command.recurrence && row.type === "task"
								? { completed: false }
								: row.metadata,
					}
				: row,
		),
	run: (command, remote) =>
		remote.setRecurrence(command.id, command.recurrence),
	invert: () => null,
	invalidation: () => ({}),
});

const setTagsHandler = defineHandler<
	Extract<TreeCommand, { kind: "setTags" }>,
	{ previous: string[] },
	void
>({
	structural: false,
	fieldKey: (command) => `${command.id}:tags`,
	validate: (command, ctx) => requireRow(ctx.rows, command.id),
	capture: (command, ctx) => ({
		previous: ctx.rows.find((row) => row.id === command.id)?.tags ?? [],
	}),
	project: (command, rows) =>
		patchRow(rows, command.id, { tags: command.tags }),
	run: (command, remote) => remote.setTags(command.id, command.tags),
	invert: (command, captured) => ({
		undo: { kind: "setTags", id: command.id, tags: captured.previous },
		redo: command,
	}),
	invalidation: () => ({ existingTags: true }),
});

const setTaskCompletedHandler = defineHandler<
	Extract<TreeCommand, { kind: "setTaskCompleted" }>,
	void,
	{ advanced: boolean; nextDueDate: string | null }
>({
	structural: false,
	fieldKey: (command) => `${command.id}:taskCompleted`,
	validate: (command, ctx) => requireRow(ctx.rows, command.id),
	capture: () => undefined,
	project: (command, rows) => {
		const today = formatCalendarDate(new Date());
		return rows.map((row) =>
			row.id === command.id
				? {
						...row,
						...(command.completed && row.recurrence && row.dueDate
							? {
									dueDate: nextRecurringDueDate(
										row.dueDate,
										row.recurrence,
										today,
									),
									metadata: { completed: false },
								}
							: { metadata: { completed: command.completed } }),
					}
				: row,
		);
	},
	run: (command, remote) =>
		remote.setTaskCompleted(
			command.id,
			command.completed,
			command.expectedDueDate,
		),
	invert: () => null,
	invalidation: () => ({ family: true }),
});

const loadMoreHandler = defineHandler<
	Extract<TreeCommand, { kind: "loadMore" }>,
	{ cursor: string[] | null },
	VisibleTreeData | null
>({
	structural: true,
	reconciliation: "appendPage",
	capture: (_command, ctx) => ({ cursor: ctx.base.nextCursor }),
	project: (_command, rows) => rows,
	run: (_command, remote, captured) =>
		captured.cursor
			? remote.fetchNextPage(captured.cursor)
			: Promise.resolve(null),
	invert: () => null,
	invalidation: () => ({}),
});

const handlers: Record<TreeCommandKind, AnyCommandHandler> = {
	toggle: toggleHandler,
	move: moveHandler,
	remove: removeHandler,
	restore: restoreHandler,
	create: createHandler,
	duplicate: duplicateHandler,
	updateContent: updateContentHandler,
	setType: setTypeHandler,
	setDueDate: setDueDateHandler,
	setRecurrence: setRecurrenceHandler,
	setTags: setTagsHandler,
	setTaskCompleted: setTaskCompletedHandler,
	loadMore: loadMoreHandler,
};

export function getHandler(kind: TreeCommandKind): AnyCommandHandler {
	return handlers[kind];
}
