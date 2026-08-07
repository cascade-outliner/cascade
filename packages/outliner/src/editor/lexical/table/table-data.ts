// Table content is intentionally static (no formulas), so the model is just
// a rectangular grid of plain-text cells: `rows[rowIndex][columnIndex]`.
export type TableRows = string[][];

// Generous caps shared with the server's content schema
// (`node-content.schema.ts`), which imports these directly the same way it
// already imports `MAX_URL_LENGTH` from this package.
export const MAX_TABLE_ROWS = 50;
export const MAX_TABLE_COLUMNS = 20;
export const MAX_TABLE_CELL_LENGTH = 2000;

export const DEFAULT_TABLE_ROWS = 2;
export const DEFAULT_TABLE_COLUMNS = 2;

export function createEmptyTableRows(
	rowCount = DEFAULT_TABLE_ROWS,
	columnCount = DEFAULT_TABLE_COLUMNS,
): TableRows {
	return Array.from({ length: rowCount }, () =>
		Array.from({ length: columnCount }, () => ""),
	);
}

/** Normalizes ragged rows (e.g. malformed/hand-edited content) to a
 * rectangular grid, padding short rows and trimming to the shared caps. */
export function normalizeTableRows(rows: TableRows): TableRows {
	const columnCount = Math.min(
		Math.max(0, ...rows.map((row) => row.length)),
		MAX_TABLE_COLUMNS,
	);
	return rows
		.slice(0, MAX_TABLE_ROWS)
		.map((row) =>
			Array.from({ length: columnCount }, (_, index) =>
				(row[index] ?? "").slice(0, MAX_TABLE_CELL_LENGTH),
			),
		);
}

export function setTableCell(
	rows: TableRows,
	rowIndex: number,
	columnIndex: number,
	value: string,
): TableRows {
	return rows.map((row, r) =>
		r !== rowIndex
			? row
			: row.map((cell, c) =>
					c !== columnIndex ? cell : value.slice(0, MAX_TABLE_CELL_LENGTH),
				),
	);
}

export function addTableRow(rows: TableRows): TableRows {
	if (rows.length >= MAX_TABLE_ROWS) return rows;
	const columnCount = rows[0]?.length ?? DEFAULT_TABLE_COLUMNS;
	return [...rows, Array.from({ length: columnCount }, () => "")];
}

export function removeTableRow(rows: TableRows, rowIndex: number): TableRows {
	if (rows.length <= 1) return rows;
	return rows.filter((_, index) => index !== rowIndex);
}

export function addTableColumn(rows: TableRows): TableRows {
	if ((rows[0]?.length ?? 0) >= MAX_TABLE_COLUMNS) return rows;
	return rows.map((row) => [...row, ""]);
}

export function removeTableColumn(
	rows: TableRows,
	columnIndex: number,
): TableRows {
	if ((rows[0]?.length ?? 0) <= 1) return rows;
	return rows.map((row) => row.filter((_, index) => index !== columnIndex));
}

/** Flattens a table's cells into a single line for plain-text contexts
 * (slugs, breadcrumbs) — cells joined by spaces, rows by a separator. */
export function tableToPlainText(rows: TableRows): string {
	return rows
		.map((row) => row.filter(Boolean).join(" "))
		.filter(Boolean)
		.join(" ");
}
