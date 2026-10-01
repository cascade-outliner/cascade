import type { Node } from "@cascade/data";
import { colors, fontSize, radius } from "@cascade/theme/tokens.stylex";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import * as stylex from "@stylexjs/stylex";
import type { EditorState } from "lexical";
import { type ReactNode, useEffect } from "react";
import { LinkDialogPlugin } from "../../link/link-dialog.tsx";
import { LinkPlugins } from "../../link/link-plugins.tsx";
import { useItem } from "../context";

const styles = stylex.create({
	wrapper: {
		position: "relative",
		flexGrow: 1,
		flexShrink: 1,
		flexBasis: "0%",
	},
	content: {
		outline: "none",
		fontSize: fontSize["600"],
	},
	link: {
		color: colors.accent,
		textDecoration: { default: "none", ":hover": "underline" },
		cursor: "text",
		marginRight: "1.25em",
		borderRadius: radius.sm,
		"[title]::after": {
			content: "attr(title)",
			display: "inline-block",
			marginLeft: "0.4em",
			fontSize: fontSize["300"],
			color: colors.muted,
		},
	},
});

const linkClassName = stylex.props(styles.link).className;

function Editable({
	style,
	onCommit,
}: {
	style?: stylex.StyleXStyles;
	onCommit?: (state: EditorState) => void;
}) {
	const [editor] = useLexicalComposerContext();

	return (
		<div {...stylex.props(styles.wrapper)}>
			<ContentEditable
				{...stylex.props(styles.content, style)}
				data-testid="outliner-content"
				onBlur={onCommit && (() => onCommit(editor.getEditorState()))}
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

export function Content({
	style,
	label,
	editable = true,
	onChange,
	onCommit,
	children,
}: {
	style?: stylex.StyleXStyles;
	/** Shown instead of the node's content, read-only (e.g. "Today" for a daily note). */
	label?: React.ReactNode;
	/** `false` shows the text without letting it be edited. */
	editable?: boolean;
	onChange?: (state: EditorState) => void;
	onCommit?: (state: EditorState) => void;
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
				nodes: [LinkNode, AutoLinkNode],
				theme: { link: linkClassName },
				onError: (error) => {
					throw error;
				},
			}}
		>
			<RichTextPlugin
				contentEditable={<Editable style={style} onCommit={onCommit} />}
				placeholder={null}
				ErrorBoundary={LexicalErrorBoundary}
			/>
			<HistoryPlugin />
			<LinkPlugins />
			{editable && <LinkDialogPlugin />}
			<SyncContentPlugin content={node.content} />
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
