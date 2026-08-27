import type { OutlineNode } from "@cascade/ui";
import type { SerializedEditorState } from "lexical";
import {
	action,
	computed,
	makeObservable,
	observable,
	runInAction,
	toJS,
} from "mobx";
import { emptyState } from "./empty-content.ts";
import { NodeModel } from "./node.ts";
import { NodeRepository } from "./persistence/node-repository.ts";
import type { Mutation, NodeSnapshot } from "./types.ts";

/** What a reduced mutation touched, ready to be written through to IndexedDB. */
interface Applied {
	snapshots: NodeSnapshot[];
	/** Captured synchronously, because persistence happens off the action. */
	rootIds?: string[];
}

/**
 * The source of truth for the outline. Mutations apply here first and are
 * written through to IndexedDB; nothing waits on a network round-trip.
 */
export class NodeStore {
	readonly userId: string;
	readonly nodes = observable.map<string, NodeModel>();

	rootIds: string[] = [];
	hydrated = false;
	persistError: unknown = null;

	private readonly repository = new NodeRepository();

	constructor(userId: string) {
		this.userId = userId;

		makeObservable(this, {
			rootIds: observable,
			hydrated: observable,
			persistError: observable.ref,
			rootNodes: computed,
			tree: computed,
			reduce: action,
			reset: action,
		});
	}

	get(id: string): NodeModel | undefined {
		return this.nodes.get(id);
	}

	get rootNodes(): NodeModel[] {
		return this.rootIds
			.map((id) => this.nodes.get(id))
			.filter((node): node is NodeModel => node !== undefined);
	}

	get tree(): OutlineNode[] {
		return this.rootNodes.map((node) => node.outlineNode);
	}

	// -- lifecycle ------------------------------------------------------------

	/** Loads this user's nodes out of IndexedDB. Safe to call more than once. */
	async hydrate(): Promise<void> {
		if (this.hydrated) {
			return;
		}

		const [snapshots, rootIds] = await Promise.all([
			this.repository.loadForUser(this.userId),
			this.repository.loadRootIds(this.userId),
		]);

		runInAction(() => {
			for (const snapshot of snapshots) {
				if (snapshot.deletedAt === null) {
					this.nodes.set(snapshot.id, new NodeModel(this, snapshot));
				}
			}

			this.reconcile(rootIds);
			this.hydrated = true;
		});
	}

	/** Drops in-memory state. IndexedDB is left alone - see `./README.md`. */
	reset(): void {
		this.nodes.clear();
		this.rootIds = [];
		this.hydrated = false;
		this.persistError = null;
	}

	// -- actions --------------------------------------------------------------

	/** Returns the id of the new node, which is generated here on the client. */
	createNode(parentId: string | null = null): string {
		const id = crypto.randomUUID();
		this.applyMutation({
			type: "node.create",
			at: Date.now(),
			id,
			parentId,
			content: emptyState(),
		});
		return id;
	}

	setContent(id: string, content: SerializedEditorState): void {
		const node = this.nodes.get(id);
		if (!node) {
			return;
		}

		// Lexical's OnChangePlugin can fire once on mount. Without this guard every
		// page load would bump `updatedAt` on every node, which last-writer-wins
		// sync would later read as a real edit.
		if (JSON.stringify(node.content) === JSON.stringify(content)) {
			return;
		}

		this.applyMutation({
			type: "node.update",
			at: Date.now(),
			id,
			patch: { content },
		});
	}

	setExpanded(id: string, expanded: boolean): void {
		this.applyMutation({
			type: "node.update",
			at: Date.now(),
			id,
			patch: { expanded },
		});
	}

	/** Covers both indent and outdent; `parentId` of `null` moves to root level. */
	move(id: string, parentId: string | null): void {
		this.applyMutation({ type: "node.move", at: Date.now(), id, parentId });
	}

	/** Soft delete: the node and its descendants become tombstones. */
	removeNode(id: string): void {
		this.applyMutation({ type: "node.delete", at: Date.now(), id });
	}

	// -- the funnel -----------------------------------------------------------

	/**
	 * The single path every write takes. When sync arrives it gains a third step
	 * - appending `mutation` to a durable outbox - and nothing else moves.
	 */
	private applyMutation(mutation: Mutation): void {
		const applied = this.reduce(mutation);
		if (applied) {
			void this.persist(applied);
		}
	}

	/** Applies a mutation to observable state. Public only so MobX can annotate it. */
	reduce(mutation: Mutation): Applied | null {
		switch (mutation.type) {
			case "node.create":
				return this.reduceCreate(mutation);
			case "node.update":
				return this.reduceUpdate(mutation);
			case "node.move":
				return this.reduceMove(mutation);
			case "node.delete":
				return this.reduceDelete(mutation);
		}
	}

	private reduceCreate(
		mutation: Extract<Mutation, { type: "node.create" }>,
	): Applied | null {
		const { id, parentId, at, content } = mutation;
		if (this.nodes.has(id)) {
			return null;
		}

		const parent = parentId === null ? null : this.nodes.get(parentId);
		if (parentId !== null && !parent) {
			return null;
		}

		const node = new NodeModel(this, {
			id,
			userId: this.userId,
			parentId,
			childIds: [],
			content,
			expanded: true,
			createdAt: at,
			updatedAt: at,
			deletedAt: null,
		});
		this.nodes.set(id, node);

		if (parent) {
			parent.childIds.push(id);
			parent.updatedAt = at;
			return { snapshots: [node.toSnapshot(), parent.toSnapshot()] };
		}

		this.rootIds.push(id);
		return { snapshots: [node.toSnapshot()], rootIds: toJS(this.rootIds) };
	}

	private reduceUpdate(
		mutation: Extract<Mutation, { type: "node.update" }>,
	): Applied | null {
		const node = this.nodes.get(mutation.id);
		if (!node) {
			return null;
		}

		if (mutation.patch.content !== undefined) {
			node.content = mutation.patch.content;
		}
		if (mutation.patch.expanded !== undefined) {
			node.expanded = mutation.patch.expanded;
		}
		node.updatedAt = mutation.at;

		return { snapshots: [node.toSnapshot()] };
	}

	private reduceMove(
		mutation: Extract<Mutation, { type: "node.move" }>,
	): Applied | null {
		const { id, parentId, at } = mutation;
		const node = this.nodes.get(id);
		if (!node || parentId === node.parentId) {
			return null;
		}

		// Moving a node inside its own subtree would detach that subtree from the
		// tree entirely.
		if (
			parentId !== null &&
			(parentId === id || this.isDescendant(parentId, id))
		) {
			return null;
		}

		const newParent = parentId === null ? null : this.nodes.get(parentId);
		if (parentId !== null && !newParent) {
			return null;
		}

		const touched: NodeModel[] = [node];
		let rootsChanged = false;

		const oldParent =
			node.parentId === null ? null : this.nodes.get(node.parentId);
		if (oldParent) {
			oldParent.childIds = oldParent.childIds.filter((each) => each !== id);
			oldParent.updatedAt = at;
			touched.push(oldParent);
		} else {
			this.rootIds = this.rootIds.filter((each) => each !== id);
			rootsChanged = true;
		}

		node.parentId = parentId;
		node.updatedAt = at;

		if (newParent) {
			newParent.childIds.push(id);
			newParent.updatedAt = at;
			touched.push(newParent);
		} else {
			this.rootIds.push(id);
			rootsChanged = true;
		}

		return {
			snapshots: touched.map((each) => each.toSnapshot()),
			rootIds: rootsChanged ? toJS(this.rootIds) : undefined,
		};
	}

	private reduceDelete(
		mutation: Extract<Mutation, { type: "node.delete" }>,
	): Applied | null {
		const { id, at } = mutation;
		const node = this.nodes.get(id);
		if (!node) {
			return null;
		}

		// Tombstones keep their `childIds`, so the subtree stays reconstructable.
		const subtree = this.collectSubtree(node);
		const snapshots: NodeSnapshot[] = [];
		for (const each of subtree) {
			each.deletedAt = at;
			each.updatedAt = at;
			snapshots.push(each.toSnapshot());
		}
		for (const each of subtree) {
			this.nodes.delete(each.id);
		}

		const parent =
			node.parentId === null ? null : this.nodes.get(node.parentId);
		if (parent) {
			parent.childIds = parent.childIds.filter((each) => each !== id);
			parent.updatedAt = at;
			snapshots.push(parent.toSnapshot());
			return { snapshots };
		}

		this.rootIds = this.rootIds.filter((each) => each !== id);
		return { snapshots, rootIds: toJS(this.rootIds) };
	}

	// -- persistence ----------------------------------------------------------

	private async persist({ snapshots, rootIds }: Applied): Promise<void> {
		try {
			await this.repository.save(this.userId, snapshots, rootIds);
		} catch (error) {
			// The observable state has already moved on; surface the divergence
			// rather than throwing out of an action.
			runInAction(() => {
				this.persistError = error;
			});
			console.error("Failed to persist nodes", error);
		}
	}

	// -- helpers --------------------------------------------------------------

	private isDescendant(id: string, ancestorId: string): boolean {
		let current = this.nodes.get(id)?.parentId ?? null;
		while (current !== null) {
			if (current === ancestorId) {
				return true;
			}
			current = this.nodes.get(current)?.parentId ?? null;
		}
		return false;
	}

	/** The node itself plus every descendant, parents before children. */
	private collectSubtree(root: NodeModel): NodeModel[] {
		const collected: NodeModel[] = [];
		const stack = [root];

		while (stack.length > 0) {
			const node = stack.pop();
			if (!node) {
				continue;
			}
			collected.push(node);
			for (const childId of node.childIds) {
				const child = this.nodes.get(childId);
				if (child) {
					stack.push(child);
				}
			}
		}

		return collected;
	}

	/**
	 * Makes the loaded state a well-formed tree: `childIds` and `rootIds` are
	 * authoritative for order, but are filtered down to entries that agree with
	 * the child's own `parentId`, and anything left unreachable - an orphan, or a
	 * cycle in a corrupted store - is detached and appended at root level rather
	 * than silently dropped.
	 */
	private reconcile(persistedRootIds: string[]): void {
		const placed = new Set<string>();
		const keep = (ids: string[], parentId: string | null) =>
			ids.filter((id) => {
				const node = this.nodes.get(id);
				if (!node || node.parentId !== parentId || placed.has(id)) {
					return false;
				}
				placed.add(id);
				return true;
			});

		this.rootIds = keep(persistedRootIds, null);
		for (const node of this.nodes.values()) {
			node.childIds = keep(node.childIds, node.id);
		}

		const reached = new Set<string>();
		const walk = (ids: string[]) => {
			const stack = [...ids];
			while (stack.length > 0) {
				const id = stack.pop();
				if (id === undefined || reached.has(id)) {
					continue;
				}
				reached.add(id);
				const node = this.nodes.get(id);
				if (node) {
					stack.push(...node.childIds);
				}
			}
		};
		walk(this.rootIds);

		const unreached = [...this.nodes.values()]
			.filter((node) => !reached.has(node.id))
			.sort((a, b) => a.createdAt - b.createdAt);

		for (const node of unreached) {
			if (reached.has(node.id)) {
				continue;
			}

			const parent =
				node.parentId === null ? null : this.nodes.get(node.parentId);
			if (parent) {
				parent.childIds = parent.childIds.filter((id) => id !== node.id);
			}

			node.parentId = null;
			this.rootIds.push(node.id);
			walk([node.id]);
		}
	}
}
