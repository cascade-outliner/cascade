import { describe, expect, it } from "vitest";
import {
	addTableColumn,
	addTableRow,
	createEmptyTableRows,
	MAX_TABLE_COLUMNS,
	MAX_TABLE_ROWS,
	normalizeTableRows,
	removeTableColumn,
	removeTableRow,
	setTableCell,
	tableToPlainText,
} from "./table-data";

describe("createEmptyTableRows", () => {
	it("defaults to a 2x2 grid of empty cells", () => {
		expect(createEmptyTableRows()).toEqual([
			["", ""],
			["", ""],
		]);
	});
});

describe("setTableCell", () => {
	it("updates only the targeted cell", () => {
		const rows = createEmptyTableRows();
		const result = setTableCell(rows, 0, 1, "hello");
		expect(result).toEqual([
			["", "hello"],
			["", ""],
		]);
		expect(rows[0]?.[1]).toBe(""); // original untouched
	});
});

describe("addTableRow / removeTableRow", () => {
	it("appends a row matching the current column count", () => {
		const rows = addTableRow([["a", "b", "c"]]);
		expect(rows).toEqual([
			["a", "b", "c"],
			["", "", ""],
		]);
	});

	it("stops growing past the row cap", () => {
		const rows = Array.from({ length: MAX_TABLE_ROWS }, () => [""]);
		expect(addTableRow(rows)).toHaveLength(MAX_TABLE_ROWS);
	});

	it("removes the targeted row", () => {
		const rows = removeTableRow([["a"], ["b"], ["c"]], 1);
		expect(rows).toEqual([["a"], ["c"]]);
	});

	it("never removes the last remaining row", () => {
		expect(removeTableRow([["a"]], 0)).toEqual([["a"]]);
	});
});

describe("addTableColumn / removeTableColumn", () => {
	it("appends a column to every row", () => {
		const rows = addTableColumn([
			["a", "b"],
			["c", "d"],
		]);
		expect(rows).toEqual([
			["a", "b", ""],
			["c", "d", ""],
		]);
	});

	it("stops growing past the column cap", () => {
		const rows = [Array.from({ length: MAX_TABLE_COLUMNS }, () => "")];
		expect(addTableColumn(rows)[0]).toHaveLength(MAX_TABLE_COLUMNS);
	});

	it("removes the targeted column from every row", () => {
		const rows = removeTableColumn(
			[
				["a", "b", "c"],
				["d", "e", "f"],
			],
			1,
		);
		expect(rows).toEqual([
			["a", "c"],
			["d", "f"],
		]);
	});

	it("never removes the last remaining column", () => {
		expect(removeTableColumn([["a"]], 0)).toEqual([["a"]]);
	});
});

describe("normalizeTableRows", () => {
	it("pads ragged rows to the widest row", () => {
		expect(normalizeTableRows([["a"], ["b", "c"]])).toEqual([
			["a", ""],
			["b", "c"],
		]);
	});
});

describe("tableToPlainText", () => {
	it("flattens cells into a single space-joined line", () => {
		expect(
			tableToPlainText([
				["Name", "Age"],
				["Ada", "36"],
			]),
		).toBe("Name Age Ada 36");
	});

	it("skips empty cells and rows", () => {
		expect(
			tableToPlainText([
				["", ""],
				["only", ""],
			]),
		).toBe("only");
	});
});
