import { toast } from "@cascade/ui/toast";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { TypedMetadata } from "@/core/nodes/node-types";
import type { TaggedNode, TagSummary } from "@/core/tags/tag.types";
import { client, orpc } from "@/orpc/client";

/**
 * Editable state for the flat, cross-tree list of nodes carrying one tag.
 * Mirrors useVisibleTree's optimistic-splice-then-persist convention, but the
 * rows here have no shared parent/order, so there's no move/indent/expand —
 * only the mutations that make sense on an unordered filtered list.
 */
export function useTagFilteredNodes(tagId: string) {
	const options = orpc.tags.nodesForTag.queryOptions({
		input: { tagId, cursor: null },
	});
	const { data } = useSuspenseQuery(options);
	const [rows, setRows] = useState<TaggedNode[]>(data.rows);
	const [nextCursor, setNextCursor] = useState(data.nextCursor);
	const loadingMore = useRef(false);

	const reload = async () => {
		const fresh = await client.tags.nodesForTag({ tagId, cursor: null });
		setRows(fresh.rows);
		setNextCursor(fresh.nextCursor);
	};

	const patch = (id: string, fn: (row: TaggedNode) => TaggedNode) =>
		setRows((prev) => prev.map((r) => (r.id === id ? fn(r) : r)));

	const updateContent = async (id: string, content: { root: unknown }) => {
		patch(id, (r) => ({ ...r, content }));
		try {
			await client.nodes.updateContent({ id, content });
		} catch {
			reload();
		}
	};

	/** Convert a node's type or update its per-type metadata (e.g. task completion). */
	const setType = async (id: string, typed: TypedMetadata) => {
		patch(id, (r) => ({ ...r, type: typed.type, metadata: typed.metadata }));
		try {
			await client.nodes.setType({ id, ...typed });
		} catch {
			reload();
		}
	};

	const remove = async (id: string) => {
		setRows((prev) => prev.filter((r) => r.id !== id));
		try {
			const { childrenDeleted } = await client.nodes.delete({ id });
			toast.success(
				childrenDeleted > 0
					? `Node deleted along with ${childrenDeleted} child node${childrenDeleted === 1 ? "" : "s"}`
					: "Node deleted",
			);
		} catch {
			reload();
		}
	};

	const addTag = async (id: string, tag: TagSummary) => {
		patch(id, (r) =>
			r.tags.some((t) => t.id === tag.id)
				? r
				: { ...r, tags: [...r.tags, tag] },
		);
		try {
			await client.tags.attach({ nodeId: id, tagId: tag.id });
		} catch {
			reload();
		}
	};

	/** Detaching the tag this page is filtered on drops the row from the list. */
	const removeTag = async (id: string, removedTagId: string) => {
		if (removedTagId === tagId) {
			setRows((prev) => prev.filter((r) => r.id !== id));
		} else {
			patch(id, (r) => ({
				...r,
				tags: r.tags.filter((t) => t.id !== removedTagId),
			}));
		}
		try {
			await client.tags.detach({ nodeId: id, tagId: removedTagId });
		} catch {
			reload();
		}
	};

	const loadMore = async () => {
		if (loadingMore.current || !nextCursor) return;
		loadingMore.current = true;
		try {
			const next = await client.tags.nodesForTag({ tagId, cursor: nextCursor });
			setRows((prev) => [...prev, ...next.rows]);
			setNextCursor(next.nextCursor);
		} finally {
			loadingMore.current = false;
		}
	};

	return {
		rows,
		hasMore: nextCursor !== null,
		updateContent,
		setType,
		remove,
		addTag,
		removeTag,
		loadMore,
	};
}
