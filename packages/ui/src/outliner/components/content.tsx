import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import * as stylex from "@stylexjs/stylex";
import type { EditorState } from "lexical";
import { useItem } from "../context";

const styles = stylex.create({
	wrapper: {
		flexGrow: 1,
		flexShrink: 1,
		flexBasis: "0%",
	},
	content: {
		outline: "none",
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
				editorState: JSON.stringify(node.text),
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
