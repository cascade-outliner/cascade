import { isoDay, shiftDay } from "@cascade/data";
import { CalendarBlankIcon, CalendarXIcon } from "@phosphor-icons/react";
import type { SlashCommand } from "../types.ts";

const GROUP = "Due date";

export const dueCommands: SlashCommand[] = [
	{
		id: "due-today",
		capture: true,
		group: GROUP,
		label: "Due today",
		keywords: ["date", "deadline"],
		icon: <CalendarBlankIcon size={15} />,
		run: ({ store, node }) => store.setDue(node.id, isoDay(new Date())),
	},
	{
		id: "due-tomorrow",
		capture: true,
		group: GROUP,
		label: "Due tomorrow",
		keywords: ["date", "deadline"],
		icon: <CalendarBlankIcon size={15} />,
		run: ({ store, node }) => store.setDue(node.id, isoDay(shiftDay(null, 1))),
	},
	{
		id: "due-next-week",
		capture: true,
		group: GROUP,
		label: "Due next week",
		keywords: ["date", "deadline"],
		icon: <CalendarBlankIcon size={15} />,
		run: ({ store, node }) => store.setDue(node.id, isoDay(shiftDay(null, 7))),
	},
	{
		id: "remove-due",
		group: GROUP,
		label: "Remove due date",
		keywords: ["clear", "unschedule"],
		icon: <CalendarXIcon size={15} />,
		available: ({ node }) => !!node.due,
		run: ({ store, node }) => store.setDue(node.id, null),
	},
];
