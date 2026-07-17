import type {
	TypedMetadata,
	VisibleNodeRow,
} from "@cascade/outliner/node-types";
import type { AddNodeOptions, VisibleTree } from "@cascade/outliner/tree-types";
import {
	appendRow,
	collapseNode,
	expandNode,
	insertRowAfter,
	type MoveTarget,
	moveSubtree,
	patchRow,
	removeSubtree,
} from "@cascade/outliner/visible-rows";
import { toast } from "@cascade/ui/toast";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { client, orpc } from "@/orpc/client";
import { existingTagsOptions } from "@/ui/nodes/use-existing-tags";

interface VisibleTreeData {
	rows: VisibleNodeRow[];
	nextCursor: string[] | null;
}

export function visibleTreeOptions(rootId: string | null) {
	return orpc.nodes.visibleTree.queryOptions({ input: { rootId } });
}

/**
 * Single owner of the flat visible-tree cache entry and every mutation that
 * touches it. Each mutation is a `useMutation` that patches the flat array
 * optimistically in `onMutate`, then persists and reconciles with the server
 * (whose fractional order is authoritative) in `onError`/`onSuccess`.
 */
export function useVisibleTree(rootId: string | null): VisibleTree {
	const queryClient = useQueryClient();
	const options = visibleTreeOptions(rootId);
	const { data } = useSuspenseQuery(options);

	const setRows = (fn: (rows: VisibleNodeRow[]) => VisibleNodeRow[]) => {
		queryClient.setQueryData(
			options.queryKey,
			(old: VisibleTreeData | undefined) =>
				old ? { ...old, rows: fn(old.rows) } : old,
		);
	};

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: options.queryKey });

	// The VisibleTree contract is fire-and-forget (`void | Promise<void>`);
	// failures are already surfaced via each mutation's onError (toast/invalidate).
	const swallow = async (promise: Promise<unknown>) => {
		try {
			await promise;
		} catch {}
	};

	const toggleMutation = useMutation({
		mutationFn: async ({ id, expanded }: { id: string; expanded: boolean }) => {
			if (expanded) {
				const subtree = await client.nodes.visibleTree({ rootId: id });
				setRows((rows) => expandNode(rows, id, subtree.rows));
				await client.nodes.toggleExpanded({ id, expanded: true });
			} else {
				await client.nodes.toggleExpanded({ id, expanded: false });
			}
		},
		onMutate: ({ id, expanded }) => {
			setRows((rows) =>
				expanded
					? patchRow(rows, id, { expanded: true })
					: collapseNode(rows, id),
			);
		},
		onError: () => invalidate(),
	});
	const toggle = (id: string, expanded: boolean) =>
		swallow(toggleMutation.mutateAsync({ id, expanded }));

	const moveMutation = useMutation({
		mutationFn: async ({
			id,
			target,
			expandParentId,
		}: {
			id: string;
			target: MoveTarget;
			expandParentId?: string;
		}) => {
			await Promise.all([
				client.nodes.move(
					target.position === "append"
						? { id, parentId: target.parentId, position: "append" }
						: {
								id,
								parentId: target.parentId,
								position: target.position,
								targetId: target.targetId,
							},
				),
				expandParentId
					? client.nodes.toggleExpanded({ id: expandParentId, expanded: true })
					: null,
			]);
		},
		onMutate: ({ id, target, expandParentId }) => {
			setRows((rows) => {
				const expanded = expandParentId
					? patchRow(rows, expandParentId, { expanded: true })
					: rows;
				return moveSubtree(expanded, id, target);
			});
		},
		onSettled: () => {
			// Server-computed fractional order is authoritative; positions match,
			// so this reconciliation is invisible unless a concurrent edit raced us.
			invalidate();
		},
	});
	const move = (
		id: string,
		target: MoveTarget,
		moveOptions: { expandParentId?: string } = {},
	) =>
		moveMutation.mutateAsync({
			id,
			target,
			expandParentId: moveOptions.expandParentId,
		});

	const removeMutation = useMutation({
		mutationFn: (vars: { id: string }) => client.nodes.delete(vars),
		onMutate: ({ id }) => setRows((rows) => removeSubtree(rows, id)),
		onSuccess: ({ childrenDeleted }) => {
			toast.success(
				childrenDeleted > 64
					? m.node_deleted_with_many_children()
					: childrenDeleted > 0
						? m.node_deleted_with_children({ count: childrenDeleted })
						: m.node_deleted(),
			);
		},
		onError: () => invalidate(),
	});
	const remove = (id: string) => swallow(removeMutation.mutateAsync({ id }));

	const updateContentMutation = useMutation({
		mutationFn: (vars: { id: string; content: { root: unknown } }) =>
			client.nodes.updateContent(vars),
		onMutate: ({ id, content }) =>
			setRows((rows) => patchRow(rows, id, { content })),
		onSuccess: (_data, { id }) => {
			// Bust breadcrumbs, but only for chains the edited node is actually
			// part of, rather than every ancestors cache entry.
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.ancestors.key(),
				predicate: (query) => {
					const chain = query.state.data as { id: string }[] | undefined;
					return chain?.some((ancestor) => ancestor.id === id) ?? false;
				},
			});
		},
		onError: () => {
			toast.error(m.node_save_failed());
			invalidate();
		},
	});
	const updateContent = (id: string, content: { root: unknown }) =>
		swallow(updateContentMutation.mutateAsync({ id, content }));

	/** Convert a node's type or update its per-type metadata (e.g. task completion). */
	const setTypeMutation = useMutation({
		mutationFn: (vars: { id: string } & TypedMetadata) =>
			client.nodes.setType(vars),
		onMutate: (vars) =>
			setRows((rows) =>
				patchRow(rows, vars.id, { type: vars.type, metadata: vars.metadata }),
			),
		onError: () => invalidate(),
	});
	const setType = (id: string, typed: TypedMetadata) =>
		swallow(setTypeMutation.mutateAsync({ id, ...typed }));

	const setDueDateMutation = useMutation({
		mutationFn: (vars: { id: string; dueDate: Date | null }) =>
			client.nodes.setDueDate(vars),
		onMutate: ({ id, dueDate }) =>
			setRows((rows) => patchRow(rows, id, { dueDate })),
		onError: () => invalidate(),
	});
	const setDueDate = (id: string, dueDate: Date | null) =>
		swallow(setDueDateMutation.mutateAsync({ id, dueDate }));

	const setTagsMutation = useMutation({
		mutationFn: (vars: { id: string; tags: string[] }) =>
			client.nodes.setTags(vars),
		onMutate: ({ id, tags }) => setRows((rows) => patchRow(rows, id, { tags })),
		onSuccess: () => {
			// A brand-new tag name may have just been created; refresh the
			// suggestion list so it's offered elsewhere without a reload.
			queryClient.invalidateQueries({
				queryKey: existingTagsOptions().queryKey,
			});
		},
		onError: () => invalidate(),
	});
	const setTags = (id: string, tags: string[]) =>
		swallow(setTagsMutation.mutateAsync({ id, tags }));

	const createMutation = useMutation({
		mutationFn: (vars: {
			parentId: string | null;
			afterId?: string;
			dueDate?: Date | null;
		}) => client.nodes.create(vars),
	});

	/** Create and append a new node as the last child of this view's root. */
	const add = async ({ dueDate = null }: AddNodeOptions = {}) => {
		const created = await createMutation.mutateAsync({
			parentId: rootId,
			dueDate,
		});
		setRows((rows) =>
			appendRow(rows, {
				id: created.id,
				parentId: created.parentId,
				content: created.content,
				type: created.type,
				metadata: created.metadata,
				expanded: created.expanded,
				order: created.order,
				dueDate: created.dueDate,
				tags: created.tags,
				depth: 0,
				path: [created.order],
				hasChildren: created.hasChildren,
				isLastChild: true,
			}),
		);
		return created.id;
	};

	/** Create a new node as the next sibling right after `afterId`. */
	const addAfter = async (afterId: string, addOptions: AddNodeOptions = {}) => {
		const { dueDate = null } = addOptions;
		const sibling = data.rows.find((r) => r.id === afterId);
		if (!sibling) return add(addOptions);
		const created = await createMutation.mutateAsync({
			parentId: sibling.parentId,
			afterId,
			dueDate,
		});
		setRows((rows) =>
			insertRowAfter(rows, afterId, {
				id: created.id,
				parentId: created.parentId,
				content: created.content,
				type: created.type,
				metadata: created.metadata,
				expanded: created.expanded,
				order: created.order,
				dueDate: created.dueDate,
				tags: created.tags,
				depth: sibling.depth,
				path: [...sibling.path.slice(0, -1), created.order],
				hasChildren: created.hasChildren,
				isLastChild: sibling.isLastChild,
			}),
		);
		return created.id;
	};

	const loadMoreMutation = useMutation({
		mutationFn: () =>
			client.nodes.visibleTree({ rootId, cursor: data.nextCursor }),
		onSuccess: (next) => {
			queryClient.setQueryData(
				options.queryKey,
				(old: VisibleTreeData | undefined) =>
					old
						? { rows: [...old.rows, ...next.rows], nextCursor: next.nextCursor }
						: old,
			);
		},
	});
	const loadMore = async () => {
		if (loadMoreMutation.isPending || !data.nextCursor) return;
		await loadMoreMutation.mutateAsync();
	};

	return {
		rows: data.rows,
		hasMore: data.nextCursor !== null,
		toggle,
		move,
		remove,
		updateContent,
		setType,
		setDueDate,
		setTags,
		add,
		addAfter,
		loadMore,
	};
}
