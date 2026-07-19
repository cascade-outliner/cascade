import { isUuid, isUuidFirstBlock, splitNodeSlug } from "@/ui/nodes/node-slug";

const EDGE_SLASHES = /^\/+|\/+$/g;
const LINK_TYPES = new Set(["link", "autolink"]);

const compactNodeId = (id: string) => id.split("-")[0] ?? id;

function extractLinkedNodeId(url: string): string | null {
	try {
		const parsed = new URL(url);
		const path = decodeURIComponent(parsed.pathname).replace(EDGE_SLASHES, "");
		if (!path || path.includes("/")) return null;

		const { slugId } = splitNodeSlug(path);
		return isUuid(slugId) || isUuidFirstBlock(slugId) ? slugId : null;
	} catch {
		return null;
	}
}

export function contentLinksToNode(content: unknown, nodeId: string): boolean {
	const targetIds = new Set([nodeId, compactNodeId(nodeId)]);
	const stack = [content];

	while (stack.length > 0) {
		const current = stack.pop();
		if (!current || typeof current !== "object") continue;

		if (Array.isArray(current)) {
			for (const child of current) stack.push(child);
			continue;
		}

		const node = current as {
			type?: unknown;
			url?: unknown;
			isUnlinked?: unknown;
			children?: unknown[];
			root?: unknown;
		};

		if (
			LINK_TYPES.has(String(node.type)) &&
			typeof node.url === "string" &&
			node.isUnlinked !== true
		) {
			const linkedNodeId = extractLinkedNodeId(node.url);
			if (linkedNodeId && targetIds.has(linkedNodeId)) return true;
		}

		if (Array.isArray(node.children)) {
			for (const child of node.children) stack.push(child);
		}
		if ("root" in node) stack.push(node.root);
	}

	return false;
}
