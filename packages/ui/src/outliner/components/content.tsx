import type { Node } from "@cascade/data";
import { fontSize } from "@cascade/theme/tokens.stylex";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import * as stylex from "@stylexjs/stylex";
import type { EditorState } from "lexical";
import { useEffect } from "react";
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
});

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
	onChange,
	onCommit,
}: {
	style?: stylex.StyleXStyles;
	onChange?: (state: EditorState) => void;
	onCommit?: (state: EditorState) => void;
}) {
	const { node } = useItem();

	return (
		<LexicalComposer
			initialConfig={{
				namespace: `outliner-node-${node.id}`,
				editorState: JSON.stringify(node.content),
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
			<SyncContentPlugin content={node.content} />
			{onChange && (
				<OnChangePlugin
					onChange={onChange}
					ignoreHistoryMergeTagChange
					ignoreSelectionChange
				/>
			)}
		</LexicalComposer>
	);
}
