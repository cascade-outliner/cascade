import { plainText } from "@cascade/data";
import {
	LinkSimpleIcon,
	MagnifyingGlassPlusIcon,
	SparkleIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import type { SlashCommand } from "../types.ts";

const GROUP = "Node";

export const nodeCommands: SlashCommand[] = [
	{
		id: "zoom-in",
		capture: true,
		group: GROUP,
		label: "Zoom in",
		keywords: ["open", "focus"],
		icon: <MagnifyingGlassPlusIcon size={15} />,
		run: ({ zoomTo, node }) => zoomTo(node.id),
	},
	{
		id: "break-into-steps",
		group: GROUP,
		label: "Break into steps",
		description: "Let AI split this note into tasks",
		keywords: ["split", "ai", "tasks"],
		icon: <SparkleIcon size={15} />,
		available: ({ split }) => !!split,
		run: ({ split, node }) => {
			if (plainText(node.content).trim()) split?.(node.id);
		},
	},
	{
		id: "copy-link",
		group: GROUP,
		label: "Copy link",
		keywords: ["url", "share"],
		icon: <LinkSimpleIcon size={15} />,
		run: ({ node }) => {
			const url = new URL(`/node/${node.id}`, window.location.origin);
			navigator.clipboard.writeText(url.toString());
		},
	},
	{
		id: "delete",
		group: GROUP,
		label: "Delete",
		keywords: ["remove", "trash"],
		icon: <TrashIcon size={15} />,
		danger: true,
		run: ({ store, node }) => store.remove(node.id),
	},
];
