import {
	DecoratorNode,
	type DOMConversionMap,
	type DOMExportOutput,
	type EditorConfig,
	type LexicalEditor,
	type LexicalNode,
	type NodeKey,
	type SerializedLexicalNode,
	type Spread,
} from "lexical";
import type { ReactNode } from "react";
import { TableGrid } from "./components/table-grid";
import { normalizeTableRows, type TableRows } from "./table-data";

export type SerializedTableGridNode = Spread<
	{ rows: TableRows },
	SerializedLexicalNode
>;

/**
 * A table's cells hold plain text only (see #453's "static tabular data"
 * scope) — no nested rich-text editors — so it's a `DecoratorNode` that owns
 * its own React subtree (`TableGridEditView`, rendered by
 * `EditableContent`'s decorator loop) rather than a composite of Lexical
 * element nodes the way `@lexical/table` builds row/cell nodes.
 */
export class TableGridNode extends DecoratorNode<ReactNode> {
	__rows: TableRows;

	static getType(): string {
		return "table";
	}

	static clone(node: TableGridNode): TableGridNode {
		return new TableGridNode(node.__rows, node.__key);
	}

	constructor(rows: TableRows, key?: NodeKey) {
		super(key);
		this.__rows = rows;
	}

	static importJSON(serializedNode: SerializedTableGridNode): TableGridNode {
		return $createTableGridNode(normalizeTableRows(serializedNode.rows));
	}

	exportJSON(): SerializedTableGridNode {
		return {
			type: "table",
			version: 1,
			rows: this.__rows,
		};
	}

	createDOM(): HTMLElement {
		const div = document.createElement("div");
		div.className = "my-1";
		return div;
	}

	updateDOM(): boolean {
		return false;
	}

	// A table replaces a node's whole (single-block) content, so it must be
	// a block-level root child — `DecoratorNode`'s default `isInline()`
	// returns true, which is for decorators meant to sit inside a paragraph.
	isInline(): boolean {
		return false;
	}

	exportDOM(): DOMExportOutput {
		const table = document.createElement("table");
		for (const row of this.__rows) {
			const tr = document.createElement("tr");
			for (const cell of row) {
				const td = document.createElement("td");
				td.textContent = cell;
				tr.append(td);
			}
			table.append(tr);
		}
		return { element: table };
	}

	static importDOM(): DOMConversionMap | null {
		return null;
	}

	getRows(): TableRows {
		return this.__rows;
	}

	setRows(rows: TableRows): void {
		const self = this.getWritable();
		self.__rows = normalizeTableRows(rows);
	}

	decorate(_editor: LexicalEditor, _config: EditorConfig): ReactNode {
		return <TableGrid rows={this.__rows} nodeKey={this.__key} />;
	}
}

export function $createTableGridNode(rows: TableRows): TableGridNode {
	return new TableGridNode(rows);
}

export function $isTableGridNode(
	node: LexicalNode | null | undefined,
): node is TableGridNode {
	return node instanceof TableGridNode;
}
