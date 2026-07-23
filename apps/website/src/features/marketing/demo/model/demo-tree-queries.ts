import { lexicalToPlainText } from "@cascade/outliner/lexical-content";
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { subtreeRange } from "@cascade/outliner/visible-rows";

export interface DemoTreeAncestor {
	id: string;
	label: string;
}

export function getVisibleDemoRows(
	allNodes: VisibleNodeRow[],
	rootId: string | null,
): VisibleNodeRow[] {
	const scope = getRootScope(allNodes, rootId);
	if (!scope) return [];

	const visibleRows: VisibleNodeRow[] = [];
	let collapsedDepth: number | null = null;

	for (const row of scope.rows) {
		const relativeDepth = row.depth - scope.rootDepth - 1;

		if (collapsedDepth !== null) {
			if (relativeDepth > collapsedDepth) continue;
			collapsedDepth = null;
		}

		visibleRows.push(
			relativeDepth === row.depth ? row : { ...row, depth: relativeDepth },
		);

		if (!row.expanded) collapsedDepth = relativeDepth;
	}

	return visibleRows;
}

export function getDemoTreeAncestors(
	allNodes: VisibleNodeRow[],
	rootId: string | null,
	untitledLabel: string,
): DemoTreeAncestor[] {
	if (rootId === null) return [];

	const ancestors: DemoTreeAncestor[] = [];
	let current = allNodes.find((row) => row.id === rootId);

	while (current) {
		ancestors.unshift({
			id: current.id,
			label: lexicalToPlainText(current.content) || untitledLabel,
		});
		const parentId = current.parentId;
		current =
			parentId === null
				? undefined
				: allNodes.find((row) => row.id === parentId);
	}

	return ancestors;
}

function getRootScope(allNodes: VisibleNodeRow[], rootId: string | null) {
	if (rootId === null) {
		return { rows: allNodes, rootDepth: -1 };
	}

	const range = subtreeRange(allNodes, rootId);
	if (!range) return null;

	return {
		rows: allNodes.slice(range.start + 1, range.end),
		rootDepth: allNodes[range.start].depth,
	};
}
