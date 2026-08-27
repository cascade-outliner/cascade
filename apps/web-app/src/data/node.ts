import type { OutlineNode } from "@cascade/ui";
import type { SerializedEditorState } from "lexical";
import { computed, makeObservable, observable, toJS } from "mobx";
import { emptyState } from "./empty-content.ts";
import type { NodeStore } from "./node-store.ts";
import type { NodeSnapshot } from "./types.ts";

/** One node of the outline, observable so the UI reacts to it directly. */
export class NodeModel {
	readonly id: string;
	readonly userId: string;
	readonly createdAt: number;

	parentId: string | null;
	childIds: string[];
	content: SerializedEditorState | null;
	expanded: boolean;
	updatedAt: number;
	deletedAt: number | null;

	private readonly store: NodeStore;

	constructor(store: NodeStore, snapshot: NodeSnapshot) {
		this.store = store;
		this.id = snapshot.id;
		this.userId = snapshot.userId;
		this.createdAt = snapshot.createdAt;
		this.parentId = snapshot.parentId;
		this.childIds = snapshot.childIds;
		// `content` is always replaced wholesale, never mutated in place, so a deep
		// proxy over a whole Lexical document would be pure overhead.
		this.content = snapshot.content;
		this.expanded = snapshot.expanded;
		this.updatedAt = snapshot.updatedAt;
		this.deletedAt = snapshot.deletedAt;

		makeObservable(this, {
			parentId: observable,
			childIds: observable,
			content: observable.ref,
			expanded: observable,
			updatedAt: observable,
			deletedAt: observable,
			children: computed,
			outlineNode: computed,
		});
	}

	get children(): NodeModel[] {
		return this.childIds
			.map((id) => this.store.get(id))
			.filter((node): node is NodeModel => node !== undefined);
	}

	/** The shape `@cascade/ui` renders. Memoized, so only changed subtrees rebuild. */
	get outlineNode(): OutlineNode {
		return {
			id: this.id,
			text: this.content ?? emptyState(),
			children: this.children.map((child) => child.outlineNode),
			collapsed: !this.expanded,
		};
	}

	/**
	 * Plain, structured-cloneable data for IndexedDB. Observable arrays are
	 * Proxies, which `structuredClone` refuses, so `toJS` is load-bearing here.
	 */
	toSnapshot(): NodeSnapshot {
		return {
			id: this.id,
			userId: this.userId,
			parentId: this.parentId,
			childIds: toJS(this.childIds),
			content: this.content,
			expanded: this.expanded,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
			deletedAt: this.deletedAt,
		};
	}
}
