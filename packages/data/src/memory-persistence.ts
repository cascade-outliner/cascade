import type { Node, OutlinePersistence } from "./types.ts";

/** Keeps the outline in memory. The default persistence, and the one tests read back from. */
export class MemoryPersistence implements OutlinePersistence {
	readonly nodes = new Map<string, Node>();

	async load(): Promise<Node[]> {
		return [...this.nodes.values()];
	}

	async write(change: { put: Node[]; delete: string[] }): Promise<void> {
		for (const node of change.put) {
			this.nodes.set(node.id, node);
		}
		for (const id of change.delete) {
			this.nodes.delete(id);
		}
	}
}
