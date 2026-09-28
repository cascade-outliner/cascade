import type { Node, OutlineStore } from "@cascade/data";
import type { SlashMenuItem } from "@cascade/ui/slash-menu";
import type { LexicalEditor } from "lexical";

/**
 * What a slash command gets to look at and act on. Built fresh when the
 * command runs, after the "/query" text has left the node.
 */
export interface SlashCommandContext {
	store: OutlineStore;
	/** The node the slash was typed in. */
	node: Node;
	/** Direct children of `node`, visible or not. */
	childCount: number;
	/** The node's editor, for commands that change its text. */
	editor: LexicalEditor;
	zoomTo: (id: string | null) => void;
	/** Opens the "Break into steps" sheet for a node. Unset when AI is off. */
	split?: (id: string) => void;
}

/**
 * One entry of the slash menu.
 *
 * To add a command, append an object to the group's file in `./commands/`
 * (or start a new file and list it in `./registry.ts`). The menu shows the
 * commands in registry order, filters them by label and `keywords`, and hides
 * the ones whose `available` says no.
 */
export interface SlashCommand extends SlashMenuItem {
	/** Whether to offer the command for this node right now. Left out: always. */
	available?: (context: SlashCommandContext) => boolean;
	run: (context: SlashCommandContext) => void;
}
