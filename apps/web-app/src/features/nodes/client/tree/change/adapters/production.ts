import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import type { DueDateRange } from "@cascade/outliner/node-filters";
import type {
	TypedMetadata,
	VisibleNodeRow,
} from "@cascade/outliner/node-types";
import {
	markRowRestored,
	playRowExit,
} from "@cascade/outliner/row-lifecycle-motion";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { existingTagsOptions } from "@/features/nodes/client/tags/use-existing-tags";
import { undoStore } from "@/features/nodes/client/undo/undo-store";
import { client, orpc } from "@/orpc/client";
import { fetchFullSubtree } from "../../fetch-full-subtree";
import type { VisibleTreeData } from "../../tree-data.types";
import { ChangeJournal } from "../journal";
import type {
	CreatedNode,
	TreeHistory,
	TreeMotion,
	TreeRemote,
	TreeViewStore,
} from "../ports";
import type { DeletionReceipt, TreeCommand } from "../types";

function toSnapshotInput(row: VisibleNodeRow) {
	return {
		id: row.id,
		content: row.content as { root: unknown } | null,
		expanded: row.expanded,
		dueDate: row.dueDate,
		recurrence: row.recurrence ?? null,
		tags: row.tags,
		...({ type: row.type, metadata: row.metadata } as TypedMetadata),
	};
}

function toRestoreInput(receipt: DeletionReceipt) {
	return {
		parentId: receipt.target.parentId,
		target:
			receipt.target.position === "append"
				? { position: "append" as const }
				: {
						position: receipt.target.position,
						targetId: receipt.target.targetId,
					},
		root: toSnapshotInput(receipt.row),
		descendants: receipt.descendants.map((row) => ({
			...toSnapshotInput(row),
			parentId: row.parentId as string,
			order: row.order,
		})),
	};
}

/**
 * Thin translation layer over the real oRPC `nodes` router: the remote
 * operations the change module needs, accepting semantic placement rather
 * than a fractional sibling order. `fetchWindow`/`fetchNextPage` share the
 * same `rootId`/filter input as the owning `visibleTree` query.
 */
export function createProductionTreeRemote(params: {
	rootId: string | null;
	includeCollapsedDescendants: boolean;
	dueDateRange: DueDateRange | null;
}): TreeRemote {
	const visibleTreeInput = (cursor: string[] | null) => ({
		rootId: params.rootId,
		cursor,
		includeCollapsedDescendants: params.includeCollapsedDescendants,
		...(params.dueDateRange
			? {
					dueDateStart: formatCalendarDate(params.dueDateRange.start),
					dueDateEnd: formatCalendarDate(params.dueDateRange.end),
				}
			: {}),
	});

	return {
		async toggleExpanded(id, expanded) {
			await client.nodes.toggleExpanded({ id, expanded });
		},
		fetchSubtree(id, options) {
			return fetchFullSubtree(id, options);
		},
		async move(id, target) {
			await client.nodes.move(
				target.position === "append"
					? { id, parentId: target.parentId, position: "append" }
					: {
							id,
							parentId: target.parentId,
							position: target.position,
							targetId: target.targetId,
						},
			);
		},
		remove(id) {
			return client.nodes.delete({ id });
		},
		async restore(receipt) {
			await client.nodes.restore(toRestoreInput(receipt));
		},
		create(placement, options) {
			return client.nodes.create({
				parentId: placement.parentId,
				...(placement.position === "after"
					? { afterId: placement.afterId }
					: {}),
				initialType: options?.initialType,
				dueDate: options?.dueDate ?? null,
				tags: options?.tags,
			}) as Promise<CreatedNode>;
		},
		duplicate(id) {
			return client.nodes.duplicate({ id }) as Promise<CreatedNode>;
		},
		async updateContent(id, content) {
			await client.nodes.updateContent({ id, content });
		},
		async setType(id, typed) {
			await client.nodes.setType({ id, ...typed });
		},
		async setDueDate(id, dueDate) {
			await client.nodes.setDueDate({ id, dueDate });
		},
		async setRecurrence(id, recurrence) {
			await client.nodes.setRecurrence({ id, recurrence });
		},
		async setTags(id, tags) {
			await client.nodes.setTags({ id, tags });
		},
		setTaskCompleted(id, completed, expectedDueDate) {
			return client.nodes.setTaskCompleted({
				id,
				completed,
				expectedDueDate,
				today: formatCalendarDate(new Date()),
			});
		},
		async fetchWindow(pageCount) {
			const rows: VisibleNodeRow[] = [];
			let cursor: string[] | null = null;
			for (let page = 0; page < Math.max(pageCount, 1); page++) {
				const next = await client.nodes.visibleTree(visibleTreeInput(cursor));
				rows.push(...next.rows);
				cursor = next.nextCursor;
				if (cursor === null) break;
			}
			return { rows, nextCursor: cursor };
		},
		fetchNextPage(cursor) {
			return client.nodes.visibleTree(visibleTreeInput(cursor));
		},
	};
}

/**
 * Wraps a `QueryClient` entry with the same operation journal the in-memory
 * test adapter uses, so `base`/pending replay behaves identically in
 * production and tests. Not yet constructed by any hook in this slice — see
 * the incremental migration plan in `docs/research/536-visible-tree-change-orchestration.md`.
 */
export function createProductionTreeViewStore(
	queryClient: QueryClient,
	queryKey: QueryKey,
	initial: VisibleTreeData,
): TreeViewStore {
	const journal = new ChangeJournal(initial);
	const publish = () => {
		queryClient.setQueryData<VisibleTreeData>(queryKey, {
			rows: journal.getRows(),
			nextCursor: journal.getBase().nextCursor,
		});
	};

	return {
		cancelActiveReads: () => queryClient.cancelQueries({ queryKey }),
		getBase: () => journal.getBase(),
		getRows: () => journal.getRows(),
		addPending: (entry) => {
			journal.add(entry);
			publish();
		},
		resolve: (id, updateBase) => {
			journal.resolve(id, updateBase);
			publish();
		},
		reject: (id, refreshedBase) => {
			journal.reject(id, refreshedBase);
			publish();
		},
		invalidate: (effects) => {
			if (effects.family) {
				queryClient.invalidateQueries({
					queryKey: orpc.nodes.visibleTree.key(),
				});
			}
			if (effects.existingTags) {
				queryClient.invalidateQueries({
					queryKey: existingTagsOptions().queryKey,
				});
			}
			if (effects.ancestorsOf) {
				const id = effects.ancestorsOf;
				queryClient.invalidateQueries({
					queryKey: orpc.nodes.ancestors.key(),
					predicate: (query) => {
						const chain = query.state.data as { id: string }[] | undefined;
						return chain?.some((ancestor) => ancestor.id === id) ?? false;
					},
				});
			}
		},
	};
}

/**
 * Presentation hooks the module isolates from semantic outcomes: a throwing
 * or hanging animation can never fail or block a command. Row-entering
 * markers for create/duplicate and expansion-reveal batching need the
 * command's remote result, which this port's `command`-only signature
 * doesn't carry — deferred to the slices that actually migrate those hooks
 * (#538, #543) rather than widened speculatively here.
 */
export function createProductionTreeMotion(): TreeMotion {
	return {
		async before(command: TreeCommand) {
			if (command.kind === "remove") {
				await playRowExit(command.id);
			} else if (command.kind === "restore") {
				markRowRestored(command.deletion.row.id);
			}
		},
		after() {
			// No presentation-after work is wired yet in this slice.
		},
	};
}

export function createProductionTreeHistory(): TreeHistory {
	return {
		push: (entry) => undoStore.push(entry),
	};
}
