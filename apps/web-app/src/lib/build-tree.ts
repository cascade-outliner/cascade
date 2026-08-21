import type { OutlineNode } from "@cascade/ui";
import type { SerializedEditorState } from "lexical";
import type { client } from "#/orpc/client.ts";

type Node = Awaited<ReturnType<typeof client.nodes.list>>["nodes"][number];

/**
 * Turns flat DB nodes (each with a `parentId`) into a nested `OutlineNode` tree.
 * Nodes whose `parentId` doesn't match any node in the list (orphans) are dropped silently.
 */
export function buildTree(nodes: Node[]): OutlineNode[] {
	const ids = new Set(nodes.map((n) => n.id));
	const byParent = new Map<string | null, Node[]>();

	for (const n of nodes) {
		if (n.parentId !== null && !ids.has(n.parentId)) {
			console.error(
				`buildTree: dropping node ${n.id}, parentId ${n.parentId} not found`,
			);
			continue;
		}

		const siblings = byParent.get(n.parentId) ?? [];
		siblings.push(n);
		byParent.set(n.parentId, siblings);
	}

	function toOutlineNode(n: Node): OutlineNode {
		return {
			id: n.id,
			text: n.content as SerializedEditorState,
			children: (byParent.get(n.id) ?? []).map(toOutlineNode),
		};
	}

	return (byParent.get(null) ?? []).map(toOutlineNode);
}
