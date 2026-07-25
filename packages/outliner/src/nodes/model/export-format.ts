import type { ExportFormat } from "./node-types";

export interface ExportRow {
	/** Distance from the export root (the root itself is 0). */
	depth: number;
	text: string;
}

function toMarkdown(rows: ExportRow[]): string {
	return rows.map((row) => `${"  ".repeat(row.depth)}- ${row.text}`).join("\n");
}

function escapeXmlAttribute(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

interface OutlineNode {
	text: string;
	children: OutlineNode[];
}

function renderOutline(node: OutlineNode): string {
	const attr = `text="${escapeXmlAttribute(node.text)}"`;
	return node.children.length === 0
		? `<outline ${attr} />`
		: `<outline ${attr}>${node.children.map(renderOutline).join("")}</outline>`;
}

function toOpml(rows: ExportRow[]): string {
	// Rows arrive in DFS order with each row's depth relative to the export
	// root, so a depth-indexed stack is enough to rebuild the nesting without
	// needing parent/child ids.
	const roots: OutlineNode[] = [];
	const stack: OutlineNode[] = [];

	for (const row of rows) {
		const node: OutlineNode = { text: row.text, children: [] };
		stack.length = row.depth;
		const parent = stack[row.depth - 1];
		if (parent) parent.children.push(node);
		else roots.push(node);
		stack[row.depth] = node;
	}

	const body = roots.map(renderOutline).join("");
	return `<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head><title>Cascade export</title></head><body>${body}</body></opml>`;
}

/** Serializes a DFS-ordered, depth-tagged list of nodes to a portable format. */
export function formatExport(rows: ExportRow[], format: ExportFormat): string {
	return format === "markdown" ? toMarkdown(rows) : toOpml(rows);
}
