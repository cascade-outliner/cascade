import { convertCommands } from "./commands/convert.tsx";
import { dueCommands } from "./commands/due.tsx";
import { nodeCommands } from "./commands/node.tsx";
import { organizeCommands } from "./commands/organize.tsx";
import type { SlashCommand } from "./types.ts";

/** Every slash command, in the order the menu lists them. Add new groups here. */
export const slashCommands: readonly SlashCommand[] = [
	...convertCommands,
	...dueCommands,
	...organizeCommands,
	...nodeCommands,
];

const duplicate = slashCommands.find(
	(command, index) =>
		slashCommands.findIndex((other) => other.id === command.id) !== index,
);
if (duplicate) {
	throw new Error(`Slash commands: duplicate id "${duplicate.id}"`);
}
