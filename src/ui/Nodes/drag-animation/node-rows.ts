export const NODE_ROW_ATTRIBUTE = "data-node-id";

export function nodeRowDomAttributes(nodeId: string) {
	return { [NODE_ROW_ATTRIBUTE]: nodeId };
}

export function findNodeRow(
	container: HTMLElement,
	nodeId: string,
): HTMLElement | null {
	return container.querySelector<HTMLElement>(
		`[${NODE_ROW_ATTRIBUTE}="${CSS.escape(nodeId)}"]`,
	);
}
