import { useMutation } from "@tanstack/react-query";
import type { SerializedEditorState } from "lexical";
import { orpc } from "#/orpc/client.ts";

function emptyState(): SerializedEditorState {
	return {
		root: {
			children: [
				{
					children: [],
					direction: null,
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: null,
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	} as unknown as SerializedEditorState;
}

export function CreateNodeButton() {
	const createNode = useMutation(orpc.nodes.create.mutationOptions());

	return (
		<button
			className="bg-ink text-canvas rounded px-3 py-2"
			type="button"
			onClick={() => createNode.mutate({ content: emptyState() })}
		>
			New node
		</button>
	);
}
