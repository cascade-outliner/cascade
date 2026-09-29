import type { Node } from "@cascade/data";
import { colors, fontSize, radius, space } from "@cascade/theme/tokens.stylex";
import { $isHashtagNode, HashtagNode } from "@lexical/hashtag";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HashtagPlugin } from "@lexical/react/LexicalHashtagPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import * as stylex from "@stylexjs/stylex";
import {
	$getNearestNodeFromDOMNode,
	$nodesOfType,
	type EditorState,
	TextNode,
} from "lexical";
import { type ReactNode, useEffect } from "react";
import { useItem } from "../context";

const styles = stylex.create({
	wrapper: {
		flexGrow: 1,
		flexShrink: 1,
		flexBasis: "0%",
	},
	content: {
		outline: "none",
		fontSize: fontSize["600"],
	},
	tag: {
		backgroundColor: colors.inkSubtle,
		color: colors.muted,
		paddingInline: space["1"],
		borderRadius: radius.full,
	},
});

function Editable({
	style,
	onCommit,
	onTagClick,
}: {
	style?: stylex.StyleXStyles;
	onCommit?: (state: EditorState) => void;
	onTagClick?: (tag: string) => void;
}) {
	const [editor] = useLexicalComposerContext();

	return (
		<div {...stylex.props(styles.wrapper)}>
			<ContentEditable
				{...stylex.props(styles.content, style)}
				data-testid="outliner-content"
				onBlur={onCommit && (() => onCommit(editor.getEditorState()))}
				onClick={
					onTagClick &&
					((event) => {
						const tag = editor.read(() => {
							const node = $getNearestNodeFromDOMNode(event.target as Element);
							return $isHashtagNode(node)
								? node.getTextContent().slice(1)
								: null;
						});
						if (tag) onTagClick(tag);
					})
				}
			/>
		</div>
	);
}

/**
 * Pushes `content` into the editor when it changes from outside, e.g. an edit
 * in another tab. Its own edits round-trip unchanged and are skipped.
 */
function SyncContentPlugin({ content }: { content: Node["content"] }) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		const current = editor.getEditorState().toJSON();
		if (JSON.stringify(current) === JSON.stringify(content)) {
			return;
		}
		// history-merge keeps OnChangePlugin from writing the remote edit back.
		editor.setEditorState(editor.parseEditorState(content), {
			tag: "history-merge",
		});
	}, [editor, content]);

	return null;
}

/**
 * Hashtag detection only runs on text nodes that changed, so re-mark the
 * loaded ones (initially and after a remote edit) to turn existing `#tags`
 * into chips. Runs after HashtagPlugin registers, and doesn't count as an edit.
 */
function RetagPlugin({ content }: { content: Node["content"] }) {
	const [editor] = useLexicalComposerContext();

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-run when content changes
	useEffect(() => {
		editor.update(
			() => {
				for (const text of $nodesOfType(TextNode)) text.markDirty();
			},
			{ tag: "history-merge" },
		);
	}, [editor, content]);

	return null;
}

export function Content({
	style,
	label,
	editable = true,
	onChange,
	onCommit,
	onTagClick,
	children,
}: {
	style?: stylex.StyleXStyles;
	/** Shown instead of the node's content, read-only (e.g. "Today" for a daily note). */
	label?: React.ReactNode;
	/** `false` shows the text without letting it be edited. */
	editable?: boolean;
	onChange?: (state: EditorState) => void;
	onCommit?: (state: EditorState) => void;
	/** Called with the tag (no `#`) when a `#tag` chip is clicked. */
	onTagClick?: (tag: string) => void;
	/** Extra Lexical plugins, e.g. a slash menu. Not rendered with a `label`. */
	children?: ReactNode;
}) {
	const { node } = useItem();

	if (label !== undefined) {
		return (
			<div {...stylex.props(styles.wrapper)}>
				<div {...stylex.props(styles.content, style)}>{label}</div>
			</div>
		);
	}

	return (
		<LexicalComposer
			initialConfig={{
				namespace: `outliner-node-${node.id}`,
				editorState: JSON.stringify(node.content),
				editable,
				nodes: [HashtagNode],
				theme: { hashtag: stylex.props(styles.tag).className },
				onError: (error) => {
					throw error;
				},
			}}
		>
			<RichTextPlugin
				contentEditable={
					<Editable style={style} onCommit={onCommit} onTagClick={onTagClick} />
				}
				placeholder={null}
				ErrorBoundary={LexicalErrorBoundary}
			/>
			<HashtagPlugin />
			<HistoryPlugin />
			<SyncContentPlugin content={node.content} />
			<RetagPlugin content={node.content} />
			{onChange && (
				<OnChangePlugin
					onChange={onChange}
					ignoreHistoryMergeTagChange
					ignoreSelectionChange
				/>
			)}
			{children}
		</LexicalComposer>
	);
}
