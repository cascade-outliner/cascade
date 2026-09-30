import {
	type Node,
	type OutlineStore,
	plainText,
	relativeDay,
	type Summary,
	type SummaryMode,
} from "@cascade/data";
import type { SummaryResult } from "#/server/summarize.ts";

const MAX_CHARS = 38_000;

export const lineText = (node: Node) =>
	relativeDay(node.id) ?? (plainText(node.content).trim() || "Untitled");

/** What the summary is built from: the branch as numbered, indented text. */
export interface Branch {
	outline: string;
	/** Direct children, numbered from 1 in the outline. */
	children: string[];
	/** Every line below the branch's title. */
	lines: number;
	basis: string;
}

/** djb2, so a fingerprint stays short however big the branch. */
function hash(text: string): string {
	let h = 5381;
	for (let i = 0; i < text.length; i++) {
		h = ((h << 5) + h + text.charCodeAt(i)) | 0;
	}
	return (h >>> 0).toString(36);
}

/**
 * Fingerprint of what a summary says something about: each line's text, place,
 * and task state. Collapsing a line or pinning the summary doesn't change it.
 */
export function branchBasis(store: OutlineStore, id: string): string {
	return hash(
		store
			.subtree(id)
			.map(
				({ node }) =>
					`${node.id}\u0001${node.parentId}\u0001${node.order}\u0001${plainText(node.content)}\u0001${node.task ? +node.task.done : "-"}\u0001${node.due ?? ""}`,
			)
			.join("\u0002"),
	);
}

export function readBranch(store: OutlineStore, root: Node): Branch {
	const rows = store.subtree(root.id);
	const children: string[] = [];
	const lines = [lineText(root)];
	let length = lines[0].length;
	for (const { node, depth } of rows) {
		if (depth === 0) children.push(node.id);
		const task = node.task ? (node.task.done ? "[x] " : "[ ] ") : "";
		const number = depth === 0 ? `[${children.length}] ` : "";
		const due = node.due ? ` (due ${node.due})` : "";
		const line = `${"  ".repeat(depth + 1)}${number}${task}${plainText(node.content).trim() || "Untitled"}${due}`;
		length += line.length + 1;
		if (length > MAX_CHARS) break;
		lines.push(line);
	}
	return {
		outline: lines.join("\n"),
		children,
		lines: rows.length,
		basis: branchBasis(store, root.id),
	};
}

/** Renumbers the model's branch numbers into footnotes, in the order they're first cited. */
export function toSummary(
	result: SummaryResult,
	branch: Branch,
	mode: SummaryMode,
): Summary {
	const sources: string[] = [];
	const footnote = (n: number) => {
		const id = branch.children[n - 1];
		if (!id) return [];
		if (!sources.includes(id)) sources.push(id);
		return [sources.indexOf(id) + 1];
	};
	return {
		mode,
		sentences: result.sentences.map(({ text, status, sources: cited }) => ({
			text,
			...(status ? { status } : {}),
			sources: cited.flatMap(footnote),
		})),
		sources,
		basis: branch.basis,
		createdAt: Date.now(),
	};
}
