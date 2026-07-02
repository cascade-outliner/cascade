import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { $createParagraphNode, $createTextNode, $getRoot } from "lexical";
import type { NodeType } from "#/core/nodes/node.types";
import { EditableContent } from "#/ui/Lexical/Edit/lexical-editable-content";
import type { LexicalElementNode } from "#/ui/Lexical/Read/lexical-read-view";
import type { LexicalTextNode } from "#/ui/Lexical/Read/render-text-nodes";

export interface LexicalEditViewProps
	extends Pick<NodeType, "id" | "parentId"> {
	content: {
		root: LexicalElementNode;
	};
	onExit?: () => void;
}

function buildInitialState(content: LexicalEditViewProps["content"]) {
	return () => {
		const root = $getRoot();
		for (const paragraph of content.root.children ?? []) {
			const paragraphNode = $createParagraphNode();
			const children =
				"children" in paragraph ? (paragraph.children ?? []) : [];
			for (const child of children as LexicalTextNode[]) {
				const textNode = $createTextNode(child.text);
				textNode.setFormat(child.format ?? 0);
				paragraphNode.append(textNode);
			}
			root.append(paragraphNode);
		}
	};
}

export function LexicalEditView({
	id,
	parentId,
	content,
	onExit,
}: LexicalEditViewProps) {
	return (
		<LexicalComposer
			initialConfig={{
				namespace: `node-editor-${id}`,
				onError: (error) => {
					throw error;
				},
				editorState: buildInitialState(content),
			}}
		>
			<EditableContent id={id} parentId={parentId} onExit={onExit} />
		</LexicalComposer>
	);
}
