import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import type { TableRows } from "../table-data";

/** Read-only counterpart to `TableGrid` — same tanstack-table row/column
 * model, but plain text cells instead of inputs. */
export function TableGridRead({ rows }: { rows: TableRows }) {
	const columnCount = rows[0]?.length ?? 0;

	const columns = useMemo<ColumnDef<string[]>[]>(
		() =>
			Array.from({ length: columnCount }, (_, columnIndex) => ({
				id: `col-${columnIndex}`,
				accessorFn: (row) => row[columnIndex] ?? "",
				cell: (info) => info.getValue<string>(),
			})),
		[columnCount],
	);

	const table = useReactTable({
		data: rows,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getRowId: (_row, index) => String(index),
	});

	return (
		<table className="my-1 w-full border-collapse rounded-lg text-sm">
			<tbody>
				{table.getRowModel().rows.map((row) => (
					<tr key={row.id}>
						{row.getVisibleCells().map((cell) => (
							<td
								key={cell.id}
								className="border border-ink/10 px-2 py-1.5 dark:border-surface/10"
							>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	);
}
