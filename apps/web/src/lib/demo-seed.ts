import type {
	NodeTypeName,
	VisibleNodeRow,
} from "@cascade/outliner/node-types";

interface SeedNode {
	id: string;
	type?: NodeTypeName;
	text: string;
	completed?: boolean;
	expanded?: boolean;
	dueDate?: Date;
	children?: SeedNode[];
}

function daysFromNow(amount: number): Date {
	const date = new Date();
	date.setHours(0, 0, 0, 0);
	date.setDate(date.getDate() + amount);
	return date;
}

function lexicalContent(text: string) {
	return {
		root: {
			type: "root",
			children: [{ type: "paragraph", children: [{ type: "text", text }] }],
		},
	};
}

function toRow(
	node: SeedNode,
	parentId: string | null,
	depth: number,
	order: number,
	isLastChild: boolean,
): VisibleNodeRow {
	const type = node.type ?? "text";
	return {
		id: node.id,
		parentId,
		content: lexicalContent(node.text),
		type,
		metadata: type === "task" ? { completed: node.completed ?? false } : null,
		expanded: node.expanded ?? true,
		order: String(order),
		dueDate: node.dueDate ?? null,
		depth,
		path: [],
		hasChildren: (node.children?.length ?? 0) > 0,
		isLastChild,
	};
}

/**
 * Flattens the whole seed tree depth-first, regardless of each node's
 * intended `expanded` state every node is always in this array so the
 * demo can switch which node is the current "root" without re-fetching.
 * Each row still carries its intended `expanded` flag; view-time filtering
 * (see use-demo-tree.ts's `visibleRowsForRoot`) decides what's shown.
 */
function collectAll(
	nodes: SeedNode[],
	parentId: string | null,
	depth: number,
): VisibleNodeRow[] {
	const rows: VisibleNodeRow[] = [];
	nodes.forEach((node, index) => {
		rows.push(toRow(node, parentId, depth, index, index === nodes.length - 1));
		if (node.children?.length) {
			rows.push(...collectAll(node.children, node.id, depth + 1));
		}
	});
	return rows;
}

const demoSeedTree: SeedNode[] = [
	{
		id: "welcome",
		text: "Welcome to Cascade this outline is fully interactive",
		children: [
			{ id: "welcome-1", text: "Click any line to edit it" },
			{ id: "welcome-2", text: "Press Tab / Shift+Tab to indent and outdent" },
			{ id: "welcome-3", text: "Press Enter to add a new line below" },
			{ id: "welcome-4", text: "Drag the handle to reorder rows" },
		],
	},
	{
		id: "plan",
		text: "Plan your day",
		children: [
			{
				id: "plan-1",
				type: "task",
				text: "Ship the outliner demo",
				completed: true,
			},
			{
				id: "plan-2",
				type: "task",
				text: "Reply to emails",
				dueDate: daysFromNow(0),
			},
			{
				id: "plan-3",
				type: "task",
				text: "Go for a walk",
				dueDate: daysFromNow(3),
			},
		],
	},
	{
		id: "ideas",
		text: "Ideas",
		children: [
			{
				id: "ideas-1",
				text: "Nested outlines are just better",
				expanded: false,
				children: [
					{ id: "ideas-1-1", text: "Everything is a list of lists" },
					{ id: "ideas-1-2", text: "Collapse what you don't need right now" },
				],
			},
			{ id: "ideas-2", text: "One outline for everything" },
		],
	},
	{
		id: "note",
		text: "Nothing here is saved it's just a demo. Sign up to keep your own.",
	},
];

export const demoAllNodes = collectAll(demoSeedTree, null, 0);
