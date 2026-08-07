import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { MinusIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { $getNodeByKey, type NodeKey } from "lexical";
import { useOutlinerLabels } from "../../../../i18n/outliner-labels-context";
import {
	addTableColumn,
	addTableRow,
	removeTableColumn,
	removeTableRow,
	setTableCell,
	type TableRows,
} from "../table-data";
import { $isTableGridNode } from "../table-node";

// Enter/Tab/Backspace inside a cell must stay local to the `<input>` instead
// of reaching the outliner's node-level key commands (save+create-below,
// indent/outdent, delete-when-empty — see `use-editor-commands.ts`), which
// listen on the Lexical root element. That root listener is a plain
// `addEventListener` on the contenteditable div — an ancestor of this grid's
// DOM in `TableGridNode.createDOM()` — so it fires *before* React's own
// delegated listener would. A real (non-React-delegated) `keydown` listener
// on this wrapper, added via the React 19 ref-cleanup callback below, is
// what actually runs first in native bubble order and can stop it in time.
const ISOLATED_KEYS = new Set(["Enter", "Tab", "Backspace"]);

function isolateKeydown(el: HTMLDivElement | null) {
	if (!el) return;
	const handler = (event: KeyboardEvent) => {
		if (ISOLATED_KEYS.has(event.key)) event.stopPropagation();
	};
	el.addEventListener("keydown", handler);
	return () => el.removeEventListener("keydown", handler);
}

interface TableGridProps {
	rows: TableRows;
	nodeKey: NodeKey;
}

export function TableGrid({ rows, nodeKey }: TableGridProps) {
	const [editor] = useLexicalComposerContext();
	const labels = useOutlinerLabels();
	const columnCount = rows[0]?.length ?? 0;

	function updateRows(next: TableRows) {
		editor.update(() => {
			const node = $getNodeByKey(nodeKey);
			if ($isTableGridNode(node)) node.setRows(next);
		});
	}

	// Small caps (`MAX_TABLE_ROWS`/`MAX_TABLE_COLUMNS`) keep this cheap enough
	// to rebuild on every render, which sidesteps memoizing a closure over
	// `rows`/`updateRows` that changes on every keystroke anyway.
	const columns: ColumnDef<string[]>[] = Array.from(
		{ length: columnCount },
		(_, columnIndex) => ({
			id: `col-${columnIndex}`,
			accessorFn: (row) => row[columnIndex] ?? "",
			cell: ({ row }) => (
				<input
					type="text"
					value={row.original[columnIndex] ?? ""}
					aria-label={labels.tableCellAria({
						row: row.index + 1,
						column: columnIndex + 1,
					})}
					onChange={(event) =>
						updateRows(
							setTableCell(rows, row.index, columnIndex, event.target.value),
						)
					}
					className="w-full min-w-24 bg-transparent px-2 py-1.5 text-sm outline-none"
				/>
			),
		}),
	);

	const table = useReactTable({
		data: rows,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getRowId: (_row, index) => String(index),
	});

	return (
		<div
			ref={isolateKeydown}
			className="my-1 overflow-x-auto rounded-lg border border-ink/15 dark:border-surface/15"
			contentEditable={false}
		>
			<table className="w-full border-collapse text-sm">
				<tbody>
					{table.getRowModel().rows.map((row) => (
						<tr key={row.id}>
							{row.getVisibleCells().map((cell) => (
								<td
									key={cell.id}
									className="border border-ink/10 p-0 dark:border-surface/10"
								>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</td>
							))}
							<td className="w-0 border-0 p-0 align-middle">
								<button
									type="button"
									aria-label={labels.tableRemoveRow}
									disabled={rows.length <= 1}
									onClick={() => updateRows(removeTableRow(rows, row.index))}
									className="p-1.5 text-muted outline-none hover:text-ink disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-accent/50 dark:hover:text-surface"
								>
									<MinusIcon size={12} weight="bold" />
								</button>
							</td>
						</tr>
					))}
					<tr>
						{table.getAllLeafColumns().map((column, columnIndex) => (
							<td key={column.id} className="border-0 p-0 text-center">
								<button
									type="button"
									aria-label={labels.tableRemoveColumn}
									disabled={columnCount <= 1}
									onClick={() =>
										updateRows(removeTableColumn(rows, columnIndex))
									}
									className="p-1.5 text-muted outline-none hover:text-ink disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-accent/50 dark:hover:text-surface"
								>
									<MinusIcon size={12} weight="bold" />
								</button>
							</td>
						))}
						<td />
					</tr>
				</tbody>
			</table>
			<div className="flex gap-2 border-t border-ink/10 p-1 dark:border-surface/10">
				<button
					type="button"
					onClick={() => updateRows(addTableRow(rows))}
					className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted outline-none hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/50 dark:hover:bg-surface/10 dark:hover:text-surface"
				>
					<PlusIcon size={12} weight="bold" />
					{labels.tableAddRow}
				</button>
				<button
					type="button"
					onClick={() => updateRows(addTableColumn(rows))}
					className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted outline-none hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/50 dark:hover:bg-surface/10 dark:hover:text-surface"
				>
					<PlusIcon size={12} weight="bold" />
					{labels.tableAddColumn}
				</button>
			</div>
		</div>
	);
}
