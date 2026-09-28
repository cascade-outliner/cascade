import { textState } from "@cascade/data";
import type { CaptureBarSlashMenu } from "@cascade/ui/capture-bar";
import { useOutlineStore } from "#/lib/outline-store.tsx";
import { slashCommands } from "./registry.ts";
import type { SlashCommand } from "./types.ts";

/** The commands the capture bar offers: those flagged `capture`, in registry order. */
export const captureSlashCommands: readonly SlashCommand[] =
	slashCommands.filter((command) => command.capture);

/**
 * The capture bar's slash menu: picking a command creates a node from the
 * text under `parentId`, then runs the command on that node.
 */
export function useCaptureSlashCommands(
	parentId: string | null,
	zoomTo: (id: string | null) => void,
): CaptureBarSlashMenu<SlashCommand> {
	const store = useOutlineStore();
	return {
		items: captureSlashCommands,
		onSelect: (command, text) => {
			const id = store.create(parentId, { content: textState(text) });
			const node = store.get(id);
			if (node) command.run({ store, node, childCount: 0, zoomTo });
		},
	};
}
