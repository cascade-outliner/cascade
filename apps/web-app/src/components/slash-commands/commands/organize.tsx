import {
	ArrowLineLeftIcon,
	ArrowLineRightIcon,
	CopyIcon,
} from "@phosphor-icons/react";
import type { SlashCommand } from "../types.ts";

const GROUP = "Organize";

export const organizeCommands: SlashCommand[] = [
	{
		id: "indent",
		group: GROUP,
		label: "Indent",
		keywords: ["nest", "right"],
		icon: <ArrowLineRightIcon size={15} />,
		available: ({ store, node }) => store.canIndent(node.id),
		run: ({ store, node }) => store.indent(node.id),
	},
	{
		id: "outdent",
		group: GROUP,
		label: "Outdent",
		keywords: ["unnest", "left"],
		icon: <ArrowLineLeftIcon size={15} />,
		available: ({ store, node }) => store.canOutdent(node.id),
		run: ({ store, node }) => store.outdent(node.id),
	},
	{
		id: "duplicate",
		group: GROUP,
		label: "Duplicate",
		keywords: ["copy", "clone"],
		icon: <CopyIcon size={15} />,
		run: ({ store, node }) => store.duplicate(node.id),
	},
	{
		id: "duplicate-with-children",
		group: GROUP,
		label: "Duplicate with children",
		keywords: ["copy", "clone", "subtree"],
		icon: <CopyIcon size={15} />,
		available: ({ childCount }) => childCount > 0,
		run: ({ store, node }) => store.duplicateWithChildren(node.id),
	},
];
