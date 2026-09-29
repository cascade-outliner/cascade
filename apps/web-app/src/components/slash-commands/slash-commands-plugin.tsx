import type { Node } from "@cascade/data";
import { SlashMenuPlugin } from "@cascade/ui/slash-menu";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { observer } from "mobx-react-lite";
import { useOutlineStore } from "#/lib/outline-store.tsx";
import { slashCommands } from "./registry.ts";
import type { SlashCommand, SlashCommandContext } from "./types.ts";

export interface SlashCommandsPluginProps {
	node: Node;
	childCount: number;
	onZoomTo: (id: string | null) => void;
	/** Opens the "Break into steps" sheet. Leave unset to hide that command. */
	onSplit?: (id: string) => void;
}

/**
 * Wires the slash command registry into a node's editor: typing "/" lists the
 * commands available for this node; picking one runs it against the store.
 * Render it as a child of `Outliner.Content`.
 */
export const SlashCommandsPlugin = observer(function SlashCommandsPlugin({
	node,
	childCount,
	onZoomTo,
	onSplit,
}: SlashCommandsPluginProps) {
	const store = useOutlineStore();
	const [editor] = useLexicalComposerContext();

	const context = (): SlashCommandContext | null => {
		const current = store.get(node.id);
		if (!current) return null;
		return {
			store,
			node: current,
			childCount,
			editor,
			zoomTo: onZoomTo,
			split: onSplit,
		};
	};

	const now = context();
	const items = now
		? slashCommands.filter((command) => command.available?.(now) ?? true)
		: [];

	return (
		<SlashMenuPlugin<SlashCommand>
			items={items}
			onSelect={(command) => {
				const fresh = context();
				if (fresh) command.run(fresh);
			}}
		/>
	);
});
