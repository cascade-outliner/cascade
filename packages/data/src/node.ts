import type { OutlineNode } from "@cascade/ui";
import type { SerializedEditorState } from "lexical";
import { computed, makeObservable, observable } from "mobx";
import { emptyState } from "./empty-content.ts";
import type { NodeSnapshot } from "./types.ts";

/** Resolves a sibling/child id to its model. `NodeStore.get`, in practice. */
type Lookup = (id: string) => NodeModel | undefined;

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

	private readonly lookup: Lookup;

	constructor(lookup: Lookup, snapshot: NodeSnapshot) {
		this.lookup = lookup;
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

	/** Copy the mutable fields from a fresh snapshot; identity fields never change. */
	applySnapshot(snapshot: NodeSnapshot): void {
		this.parentId = snapshot.parentId;
		this.childIds = snapshot.childIds;
		this.content = snapshot.content;
		this.expanded = snapshot.expanded;
		this.updatedAt = snapshot.updatedAt;
		this.deletedAt = snapshot.deletedAt;
	}

	get children(): NodeModel[] {
		return this.childIds
			.map((id) => this.lookup(id))
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
}
