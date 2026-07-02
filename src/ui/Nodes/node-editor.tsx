import { useState } from "react";
import type { NodeType } from "#/core/nodes/node.types";
import { LexicalEditView } from "#/ui/Lexical/Edit/lexical-edit-view";
import {
	type LexicalElementNode,
	LexicalReadView,
} from "#/ui/Lexical/Read/lexical-read-view";

interface NodeEditorProps {
	node: NodeType;
}

export function NodeEditor({ node }: NodeEditorProps) {
	const [editView, setEditView] = useState<boolean>(false);

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: We use this for now TODO: Improve onClick logic
		// biome-ignore lint/a11y/noStaticElementInteractions: We use this for now TODO: Improve onClick logic
		<div
			className="flex-1 min-w-0 cursor-text"
			onClick={() => setEditView(true)}
		>
			{editView ? (
				<LexicalEditView
					id={node.id}
					parentId={node.parentId}
					content={node.content as { root: LexicalElementNode }}
					onExit={() => setEditView(false)}
				/>
			) : (
				<LexicalReadView
					content={node.content as { root: LexicalElementNode }}
				/>
			)}
		</div>
	);
}
