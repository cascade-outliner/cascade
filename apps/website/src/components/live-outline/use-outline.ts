import { useCallback, useEffect, useRef, useState } from "react";

export interface OutlineNode {
	id: string;
	text: string;
	depth: number;
	collapsed: boolean;
	done: boolean;
}

/** [text, depth, collapsed, done] */
export type OutlineSeed = readonly [string, number, boolean?, boolean?];

interface FocusRequest {
	id: string;
	/** Caret position; `null` puts it at the end. */
	caret: number | null;
}

let nextId = 0;
const newId = () => `node-${++nextId}`;

function fromSeed(seed: readonly OutlineSeed[]): OutlineNode[] {
	return seed.map(([text, depth, collapsed = false, done = false]) => ({
		id: newId(),
		text,
		depth,
		collapsed,
		done,
	}));
}

function hasChildren(nodes: OutlineNode[], index: number) {
	return (
		index + 1 < nodes.length && nodes[index + 1].depth > nodes[index].depth
	);
}

/** Index just past the last descendant of `index`. */
function subtreeEnd(nodes: OutlineNode[], index: number) {
	let end = index + 1;
	while (end < nodes.length && nodes[end].depth > nodes[index].depth) end++;
	return end;
}

/** Indexes of nodes not hidden inside a collapsed ancestor. */
function visibleIndexes(nodes: OutlineNode[]) {
	const out: number[] = [];
	let hiddenBelow = -1;
	nodes.forEach((node, index) => {
		if (hiddenBelow >= 0 && node.depth > hiddenBelow) return;
		hiddenBelow = -1;
		out.push(index);
		if (node.collapsed && hasChildren(nodes, index)) hiddenBelow = node.depth;
	});
	return out;
}

export interface OutlineRow {
	node: OutlineNode;
	hasChildren: boolean;
	folded: boolean;
}

export function useOutline(seed: readonly OutlineSeed[]) {
	const [nodes, setNodes] = useState(() => fromSeed(seed));
	const [focusedId, setFocusedId] = useState<string | null>(null);
	const inputs = useRef(new Map<string, HTMLInputElement>());
	const pendingFocus = useRef<FocusRequest | null>(null);

	useEffect(() => {
		const request = pendingFocus.current;
		if (!request) return;
		pendingFocus.current = null;
		const input = inputs.current.get(request.id);
		if (!input) return;
		input.focus();
		const caret = request.caret ?? input.value.length;
		input.setSelectionRange(caret, caret);
	});

	const registerInput = useCallback(
		(id: string) => (element: HTMLInputElement | null) => {
			if (element) inputs.current.set(id, element);
			else inputs.current.delete(id);
		},
		[],
	);

	const focus = (request: FocusRequest) => {
		pendingFocus.current = request;
	};

	const update = (
		mutate: (draft: OutlineNode[]) => boolean | undefined,
		after?: FocusRequest,
	) => {
		setNodes((current) => {
			const draft = current.map((node) => ({ ...node }));
			if (mutate(draft) === false) return current;
			if (after) focus(after);
			return draft;
		});
	};

	const setText = (id: string, text: string) =>
		update((draft) => {
			const node = draft.find((n) => n.id === id);
			if (node) node.text = text;
			return undefined;
		});

	const toggleFold = (id: string) =>
		update((draft) => {
			const index = draft.findIndex((n) => n.id === id);
			if (index < 0 || !hasChildren(draft, index)) return false;
			draft[index].collapsed = !draft[index].collapsed;
			return undefined;
		});

	const toggleDone = (id: string) =>
		update((draft) => {
			const node = draft.find((n) => n.id === id);
			if (node) node.done = !node.done;
			return undefined;
		});

	const split = (id: string, caret: number) => {
		const createdId = newId();
		update(
			(draft) => {
				const index = draft.findIndex((n) => n.id === id);
				if (index < 0) return false;
				const node = draft[index];
				const before = node.text.slice(0, caret);
				const after = node.text.slice(caret);
				node.text = before;
				const childrenOpen = hasChildren(draft, index) && !node.collapsed;
				const at = childrenOpen ? index + 1 : subtreeEnd(draft, index);
				draft.splice(at, 0, {
					id: createdId,
					text: after,
					depth: childrenOpen ? node.depth + 1 : node.depth,
					collapsed: false,
					done: false,
				});
				return undefined;
			},
			{ id: createdId, caret: 0 },
		);
	};

	const indent = (id: string, caret: number) =>
		update(
			(draft) => {
				const index = draft.findIndex((n) => n.id === id);
				if (index <= 0 || draft[index - 1].depth < draft[index].depth) {
					return false;
				}
				const end = subtreeEnd(draft, index);
				for (let i = index; i < end; i++) draft[i].depth++;
				const visible = visibleIndexes(draft);
				const position = visible.indexOf(index);
				if (position > 0) draft[visible[position - 1]].collapsed = false;
				return undefined;
			},
			{ id, caret },
		);

	const outdent = (id: string, caret: number) =>
		update(
			(draft) => {
				const index = draft.findIndex((n) => n.id === id);
				if (index < 0 || draft[index].depth === 0) return false;
				const end = subtreeEnd(draft, index);
				for (let i = index; i < end; i++) draft[i].depth--;
				return undefined;
			},
			{ id, caret },
		);

	/** Removes an empty leaf and moves focus to its visible neighbour. */
	const remove = (id: string) => {
		const index = nodes.findIndex((n) => n.id === id);
		if (index < 0 || nodes.length === 1 || hasChildren(nodes, index)) return;
		const visible = visibleIndexes(nodes);
		const position = visible.indexOf(index);
		const neighbour =
			position > 0 ? nodes[visible[position - 1]] : nodes[visible[1]];
		update(
			(draft) => {
				draft.splice(index, 1);
				return undefined;
			},
			neighbour ? { id: neighbour.id, caret: null } : undefined,
		);
	};

	const moveFocus = (id: string, direction: -1 | 1) => {
		const visible = visibleIndexes(nodes);
		const position = visible.indexOf(nodes.findIndex((n) => n.id === id));
		const target = visible[position + direction];
		if (target === undefined) return false;
		const input = inputs.current.get(nodes[target].id);
		input?.focus();
		return Boolean(input);
	};

	const reset = () => {
		setNodes(fromSeed(seed));
		setFocusedId(null);
	};

	const rows: OutlineRow[] = visibleIndexes(nodes).map((index) => {
		const node = nodes[index];
		const children = hasChildren(nodes, index);
		return { node, hasChildren: children, folded: children && node.collapsed };
	});

	return {
		rows,
		focusedId,
		setFocusedId,
		registerInput,
		setText,
		toggleFold,
		toggleDone,
		split,
		indent,
		outdent,
		remove,
		moveFocus,
		reset,
	};
}
