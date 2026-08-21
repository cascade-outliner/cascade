import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { cva } from "cva";
import type { EditorState } from "lexical";
import { useItem } from "../context";

const content = cva({ base: "flex-1 outline-none" });

export function Content({
	className,
	onChange,
}: {
	className?: string;
	onChange?: (state: EditorState) => void;
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
					<ContentEditable className={content({ className })} />
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
