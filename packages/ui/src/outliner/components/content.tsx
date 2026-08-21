import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { cva } from "cva";
import type { EditorState } from "lexical";
import { useItem } from "../context";

const wrapper = cva({ base: "flex-1" });
const content = cva({ base: "outline-none" });

function Editable({
	className,
	onCommit,
	onIndent,
}: {
	className?: string;
	onCommit?: (state: EditorState) => void;
	onIndent?: () => void;
}) {
	const [editor] = useLexicalComposerContext();

	return (
		<div className={wrapper()}>
			<ContentEditable
				className={content({ className })}
				onBlur={onCommit && (() => onCommit(editor.getEditorState()))}
				onKeyDown={
					onIndent &&
					((event) => {
						if (event.key === "Tab" && !event.shiftKey) {
							event.preventDefault();
							onIndent();
						}
					})
				}
			/>
		</div>
	);
}

export function Content({
	className,
	onChange,
	onCommit,
	onIndent,
}: {
	className?: string;
	onChange?: (state: EditorState) => void;
	onCommit?: (state: EditorState) => void;
	onIndent?: () => void;
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
				contentEditable={
					<Editable
						className={className}
						onCommit={onCommit}
						onIndent={onIndent}
					/>
				}
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
