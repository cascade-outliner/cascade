import { useEffect, useRef, useState } from "react";

interface OutlineNode {
	id: string;
	text: string;
	depth: number;
	collapsed: boolean;
}

let uid = 0;
function createNode(
	text: string,
	depth: number,
	collapsed = false,
): OutlineNode {
	uid += 1;
	return { id: `n${uid}`, text, depth, collapsed };
}

function initialNodes(): OutlineNode[] {
	return [
		createNode("Plan the week", 0),
		createNode("Ship the Cascade landing page", 1),
		createNode("Write the launch note", 1),
		createNode("Groceries", 0, true),
		createNode("Oat milk", 1),
		createNode("Peaches, obviously", 1),
		createNode("Ideas", 0),
		createNode("A calmer way to keep lists", 1),
		createNode("Try adding your own line here", 1),
	];
}

function hasChildren(nodes: OutlineNode[], i: number) {
	return i + 1 < nodes.length && nodes[i + 1].depth > nodes[i].depth;
}

function subtreeEnd(nodes: OutlineNode[], i: number) {
	let j = i + 1;
	while (j < nodes.length && nodes[j].depth > nodes[i].depth) j++;
	return j;
}

function visibleIds(nodes: OutlineNode[]) {
	const out: string[] = [];
	let hideDeeper = -1;
	for (const n of nodes) {
		if (hideDeeper >= 0 && n.depth > hideDeeper) continue;
		hideDeeper = -1;
		out.push(n.id);
		if (n.collapsed) hideDeeper = n.depth;
	}
	return out;
}

interface PendingFocus {
	id: string;
	pos: number | null;
}

export interface OutlinerRow {
	id: string;
	text: string;
	depth: number;
	hasChildren: boolean;
	collapsed: boolean;
}

export function useOutlinerDemo() {
	const [nodes, setNodes] = useState<OutlineNode[]>(initialNodes);
	const inputs = useRef<Record<string, HTMLInputElement>>({});
	const pendingFocus = useRef<PendingFocus | null>(null);

	useEffect(() => {
		const focus = pendingFocus.current;
		if (!focus) return;
		pendingFocus.current = null;
		const el = inputs.current[focus.id];
		if (!el) return;
		el.focus();
		const pos =
			focus.pos == null
				? el.value.length
				: Math.min(focus.pos, el.value.length);
		try {
			el.setSelectionRange(pos, pos);
		} catch {
			// selection range isn't supported on every input type
		}
	});

	function toggle(id: string) {
		const i = nodes.findIndex((n) => n.id === id);
		if (i < 0 || !hasChildren(nodes, i)) return;
		const next = nodes.slice();
		next[i] = { ...next[i], collapsed: !next[i].collapsed };
		setNodes(next);
	}

	function changeText(id: string, text: string) {
		const i = nodes.findIndex((n) => n.id === id);
		if (i < 0) return;
		const next = nodes.slice();
		next[i] = { ...next[i], text };
		setNodes(next);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, id: string) {
		const target = e.currentTarget;
		const i = nodes.findIndex((n) => n.id === id);
		if (i < 0) return;
		const n = nodes[i];

		if (e.key === "Enter") {
			e.preventDefault();
			const next = nodes.slice();
			const caret = target.selectionStart ?? 0;
			const before = n.text.slice(0, caret);
			const after = n.text.slice(caret);
			const newNode = createNode(after, n.depth, false);
			next[i] = { ...n, text: before };
			let insertAt = i + 1;
			if (hasChildren(next, i) && !n.collapsed && after === "") {
				newNode.depth = n.depth + 1;
			} else if (hasChildren(next, i) && n.collapsed) {
				insertAt = subtreeEnd(next, i);
			}
			next.splice(insertAt, 0, newNode);
			pendingFocus.current = { id: newNode.id, pos: 0 };
			setNodes(next);
		} else if (e.key === "Tab") {
			e.preventDefault();
			const delta = e.shiftKey ? -1 : 1;
			const next = nodes.slice();
			if (delta === 1) {
				let prevIdx = -1;
				for (let j = i - 1; j >= 0; j--) {
					if (next[j].depth < n.depth) break;
					if (next[j].depth === n.depth) {
						prevIdx = j;
						break;
					}
				}
				if (prevIdx < 0) return;
				if (next[prevIdx].collapsed) {
					next[prevIdx] = { ...next[prevIdx], collapsed: false };
				}
			} else if (n.depth === 0) {
				return;
			}
			const end = subtreeEnd(next, i);
			for (let j = i; j < end; j++) {
				next[j] = { ...next[j], depth: next[j].depth + delta };
			}
			pendingFocus.current = { id: n.id, pos: target.selectionStart };
			setNodes(next);
		} else if (
			e.key === "Backspace" &&
			n.text === "" &&
			!hasChildren(nodes, i)
		) {
			if (nodes.length <= 1) return;
			e.preventDefault();
			const vis = visibleIds(nodes);
			const vi = vis.indexOf(id);
			const next = nodes.slice();
			next.splice(i, 1);
			const focusId = vi > 0 ? vis[vi - 1] : (vis[1] ?? null);
			if (focusId) pendingFocus.current = { id: focusId, pos: null };
			setNodes(next);
		} else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
			e.preventDefault();
			const vis = visibleIds(nodes);
			const vi = vis.indexOf(id);
			const ni = e.key === "ArrowUp" ? vi - 1 : vi + 1;
			if (ni < 0 || ni >= vis.length) return;
			const el = inputs.current[vis[ni]];
			if (el) {
				el.focus();
				const p = Math.min(target.selectionStart ?? 0, el.value.length);
				try {
					el.setSelectionRange(p, p);
				} catch {
					// selection range isn't supported on every input type
				}
			}
		}
	}

	function registerInput(id: string) {
		return (el: HTMLInputElement | null) => {
			if (el) inputs.current[id] = el;
			else delete inputs.current[id];
		};
	}

	const visSet = new Set(visibleIds(nodes));
	const rows: OutlinerRow[] = nodes
		.map((n, i) => ({ n, i }))
		.filter(({ n }) => visSet.has(n.id))
		.map(({ n, i }) => ({
			id: n.id,
			text: n.text,
			depth: n.depth,
			hasChildren: hasChildren(nodes, i),
			collapsed: n.collapsed,
		}));

	return { rows, toggle, changeText, handleKeyDown, registerInput };
}
