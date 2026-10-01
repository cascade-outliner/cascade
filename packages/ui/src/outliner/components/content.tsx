import type { Node } from "@cascade/data";
import { css } from "@cascade/theme/css";
import type { SystemStyleObject } from "@cascade/theme/types";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import type { EditorState } from "lexical";
import { type ReactNode, useEffect } from "react";
import { useItem } from "../context";

const styles = {
	wrapper: css({
		flexGrow: 1,
		flexShrink: 1,
		flexBasis: "[0%]",
	}),
	content: css.raw({
		outline: "none",
		fontSize: "600",
	}),
};

function Editable({
	css: cssProp,
	onCommit,
}: {
	css?: SystemStyleObject;
	onCommit?: (state: EditorState) => void;
}) {
	const [editor] = useLexicalComposerContext();

	return (
		<div className={styles.wrapper}>
			<ContentEditable
				className={css(styles.content, cssProp)}
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
	css: cssProp,
	label,
	editable = true,
	onChange,
	onCommit,
	children,
}: {
	css?: SystemStyleObject;
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
			<div className={styles.wrapper}>
				<div className={css(styles.content, cssProp)}>{label}</div>
			</div>
		);
	}

	return (
		<LexicalComposer
			initialConfig={{
				namespace: `outliner-node-${node.id}`,
				editorState: JSON.stringify(node.content),
				editable,
				onError: (error) => {
					throw error;
				},
			}}
		>
			<RichTextPlugin
				contentEditable={<Editable css={cssProp} onCommit={onCommit} />}
				placeholder={null}
				ErrorBoundary={LexicalErrorBoundary}
			/>
			<HistoryPlugin />
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
