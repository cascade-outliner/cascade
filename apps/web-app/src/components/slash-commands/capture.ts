import { textState } from "@cascade/data";
import { useOutlineStore } from "#/lib/outline-store.tsx";
import { slashCommands } from "./registry.ts";
import type { SlashCommand } from "./types.ts";

/** The commands the capture bar offers: those flagged `capture`, in registry order. */
export const captureSlashCommands: readonly SlashCommand[] =
	slashCommands.filter((command) => command.capture);

/**
 * What the capture bar submits: a node created from its text under
 * `parentId`, with the slash commands picked alongside run on it, in order.
 */
export function useCapture(
	parentId: string | null,
	zoomTo: (id: string | null) => void,
): (text: string, picked: readonly SlashCommand[]) => void {
	const store = useOutlineStore();
	return (text, picked) => {
		const id = store.create(parentId, { content: textState(text) });
		for (const command of picked) {
			const node = store.get(id);
			if (node) command.run({ store, node, childCount: 0, zoomTo });
		}
	};
}
