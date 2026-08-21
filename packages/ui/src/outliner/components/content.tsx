import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { cva } from "cva";
import { useItem } from "../context";

const content = cva({ base: "flex-1 outline-none" });

export function Content({ className }: { className?: string }) {
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
		</LexicalComposer>
	);
}
