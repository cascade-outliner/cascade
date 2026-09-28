import { CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import type { SlashCommand } from "../types.ts";

const GROUP = "Convert";

export const convertCommands: SlashCommand[] = [
	{
		id: "turn-into-task",
		group: GROUP,
		label: "Turn into task",
		keywords: ["todo", "checkbox"],
		icon: <CircleIcon size={14} />,
		available: ({ node }) => !node.task,
		run: ({ store, node }) => store.setTask(node.id, { done: false }),
	},
	{
		id: "turn-into-text",
		group: GROUP,
		label: "Turn into text",
		keywords: ["plain", "note"],
		icon: <CircleIcon size={6} weight="fill" />,
		available: ({ node }) => !!node.task,
		run: ({ store, node }) => store.setTask(node.id, null),
	},
	{
		id: "complete-task",
		group: GROUP,
		label: "Complete task",
		keywords: ["done", "finish", "check"],
		icon: <CheckCircleIcon size={14} weight="fill" />,
		available: ({ node }) => !!node.task && !node.task.done,
		run: ({ store, node }) => store.setTask(node.id, { done: true }),
	},
	{
		id: "reopen-task",
		group: GROUP,
		label: "Reopen task",
		keywords: ["undone", "uncheck"],
		icon: <CircleIcon size={14} />,
		available: ({ node }) => !!node.task?.done,
		run: ({ store, node }) => store.setTask(node.id, { done: false }),
	},
];
