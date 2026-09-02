import type { SerializedEditorState } from "lexical";
import { action, makeObservable, observable } from "mobx";
import type { NodeData, NodePatch } from "../types.ts";

export class NodeModel implements NodeData {
	readonly id: string;
	parentId: string | null;
	sortOrder: number;
	content: SerializedEditorState;
	collapsed: boolean;
	updatedAt: number;

	constructor(data: NodeData) {
		this.id = data.id;
		this.parentId = data.parentId;
		this.sortOrder = data.sortOrder;
		this.content = data.content;
		this.collapsed = data.collapsed;
		this.updatedAt = data.updatedAt;
		makeObservable(this, {
			parentId: observable,
			sortOrder: observable,
			content: observable.ref,
			collapsed: observable,
			updatedAt: observable,
			patch: action,
		});
	}

	patch(changes: NodePatch): void {
		if (changes.parentId !== undefined) this.parentId = changes.parentId;
		if (changes.sortOrder !== undefined) this.sortOrder = changes.sortOrder;
		if (changes.content !== undefined) this.content = changes.content;
		if (changes.collapsed !== undefined) this.collapsed = changes.collapsed;
		if (changes.updatedAt !== undefined) this.updatedAt = changes.updatedAt;
	}

	pick<K extends keyof NodePatch>(keys: K[]): Pick<NodeData, K> {
		const out = {} as Pick<NodeData, K>;
		for (const key of keys) {
			out[key] = this[key];
		}
		return out;
	}

	toData(): NodeData {
		return {
			id: this.id,
			parentId: this.parentId,
			sortOrder: this.sortOrder,
			content: this.content,
			collapsed: this.collapsed,
			updatedAt: this.updatedAt,
		};
	}
}
