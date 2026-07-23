import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import {
	recomputeIsLastChild,
	subtreeRange,
} from "@cascade/outliner/visible-rows";

type NewDemoRowFields = Pick<
	VisibleNodeRow,
	"parentId" | "depth" | "isLastChild"
> &
	Partial<Pick<VisibleNodeRow, "dueDate">>;

export function createDemoRow(
	fields: NewDemoRowFields,
	createId: () => string = () => crypto.randomUUID(),
): VisibleNodeRow {
	const id = createId();

	return {
		id,
		content: null,
		type: "text",
		metadata: null,
		expanded: false,
		order: id,
		dueDate: null,
		tags: [],
		path: [],
		hasChildren: false,
		...fields,
	};
}

export function duplicateDemoSubtree(
	rows: VisibleNodeRow[],
	id: string,
	createId: () => string = () => crypto.randomUUID(),
): VisibleNodeRow[] {
	const range = subtreeRange(rows, id);
	if (!range) return rows;

	const subtree = rows.slice(range.start, range.end);
	const replacementIds = new Map(
		subtree.map((row) => [row.id, createId()] as const),
	);
	const duplicate = subtree.map((row) => ({
		...row,
		id: getReplacementId(replacementIds, row.id),
		parentId:
			row.id === id
				? row.parentId
				: (replacementIds.get(row.parentId ?? "") ?? row.parentId),
	}));

	return recomputeIsLastChild([
		...rows.slice(0, range.end),
		...duplicate,
		...rows.slice(range.end),
	]);
}

function getReplacementId(ids: Map<string, string>, id: string): string {
	const replacement = ids.get(id);
	if (!replacement) {
		throw new Error(`Missing replacement ID for demo node "${id}"`);
	}
	return replacement;
}
