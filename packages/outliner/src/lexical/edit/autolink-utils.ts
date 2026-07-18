import { AutoLinkNode, createLinkMatcherWithRegExp } from "@lexical/link";
import {
	$getSelection,
	$isRangeSelection,
	$nodesOfType,
	type LexicalEditor,
} from "lexical";
import { $createEditableLinkNode } from "./editable-link-node";
import { tidyLinkLabel } from "./link-paste-utils";

// Requires an explicit http(s) protocol, matching extractPastedUrl, so bare
// mentions like "example.com" aren't autolinked while typing.
const URL_REGEX =
	/https?:\/\/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*[-a-zA-Z0-9()@:%_+~#&/=])?/;

export const urlLinkMatcher = createLinkMatcherWithRegExp(URL_REGEX);

/**
 * Swaps every url the user has typed (still shown as raw autolinked text
 * while they're actively extending it) for a tidy plain link node, matching
 * how a pasted url is displayed. Meant to run right before content is saved,
 * once the user is done editing this node for now (blur, Enter, ...).
 */
export function finalizePendingAutoLinks(editor: LexicalEditor): void {
	editor.update(
		() => {
			const selection = $getSelection();
			const selectedKeys = $isRangeSelection(selection)
				? new Set([selection.anchor.key, selection.focus.key])
				: null;

			for (const node of $nodesOfType(AutoLinkNode)) {
				// An autolink the user has since edited away from a valid url is
				// left as-is; it no longer has a meaningful url to finalize.
				if (node.getIsUnlinked()) continue;

				// Replacing the node drops its old text child (and the selection
				// pointing at it, if any) — Lexical requires selection to land
				// somewhere valid within the same update, or it throws.
				const hadSelection = node
					.getChildren()
					.some((child) => selectedKeys?.has(child.getKey()));

				const url = node.getURL();
				const linkNode = $createEditableLinkNode(url, tidyLinkLabel(url), url);
				node.replace(linkNode);

				if (hadSelection) linkNode.selectNext(0, 0);
			}
		},
		{ discrete: true },
	);
}
