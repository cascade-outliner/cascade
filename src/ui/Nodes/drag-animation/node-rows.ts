export const NODE_ROW_ATTRIBUTE = "data-node-id";

export function nodeRowDomAttributes(nodeId: string) {
	return { [NODE_ROW_ATTRIBUTE]: nodeId };
}

export function findNodeRow(nodeId: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(
		`[${NODE_ROW_ATTRIBUTE}="${CSS.escape(nodeId)}"]`,
	);
}

export function getAllNodeRows(): HTMLElement[] {
	return Array.from(
		document.querySelectorAll<HTMLElement>(`[${NODE_ROW_ATTRIBUTE}]`),
	);
}

export function getNodeRowId(row: HTMLElement): string | null {
	return row.getAttribute(NODE_ROW_ATTRIBUTE);
}

export function getNodeSubtreeElement(row: HTMLElement): HTMLElement {
	return row.parentElement ?? row;
}

export function stripNodeRowAttributes(root: HTMLElement): void {
	root.removeAttribute(NODE_ROW_ATTRIBUTE);
	for (const el of root.querySelectorAll(`[${NODE_ROW_ATTRIBUTE}]`)) {
		el.removeAttribute(NODE_ROW_ATTRIBUTE);
	}
}
