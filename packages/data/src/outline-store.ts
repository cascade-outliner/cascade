import type { OutlineNode } from "@cascade/ui";
import type { SerializedEditorState } from "lexical";
import { makeAutoObservable, observable, runInAction } from "mobx";
import { emptyState } from "./empty-content.ts";
import { memoryPersistence } from "./persistence/memory.ts";
import type { Node, OutlinePersistence, OutlineSnapshot } from "./types.ts";

/**
 * Synthetic parent for top-level nodes. Its `childIds` is the top-level order,
 * so there is one ordering code path instead of a `rootIds` field plus an
 * "is this a root?" branch in every mutation. Never rendered, never exposed:
 * the public API uses `parentId: null` to mean "top level".
 */
const ROOT_ID = "__root__";

/**
 * The outline, client-side and mutable. MobX-observable: `observer` components
 * that read `tree` re-render on any change. Durability is somebody else's
 * problem: the store writes whole snapshots through the injected
 * `OutlinePersistence` and never learns which adapter it got.
 *
 * Invalid structural ops (unknown id, moving a node into its own subtree) are
 * no-ops - stale ids from a React render are normal, not exceptional. `create`
 * is the one exception: an unknown parent there is a caller bug and throws,
 * because there is no id to hand back.
 */
export class OutlineStore {
	/**
	 * Reactive membership (create/remove), non-reactive values: each `Node` is
	 * made observable individually by `#put` so that `content` can stay a plain
	 * ref rather than a deep proxy over a whole Lexical document.
	 */
	readonly nodes = observable.map<string, Node>(undefined, { deep: false });
	/**
	 * `false` until `hydrate` settles. Observable, so the UI can hold off
	 * rendering an editable outline that is about to be replaced by the stored
	 * one - an edit made in that window would be written over.
	 */
	hydrated = false;
	readonly #persistence: OutlinePersistence;
	/** Set by the first local write. Guards hydration from clobbering live edits. */
	#mutated = false;
	/** Cached so concurrent callers - React in strict mode, say - share one read. */
	#hydration: Promise<void> | undefined;

	constructor(persistence: OutlinePersistence = memoryPersistence()) {
		this.#persistence = persistence;
		makeAutoObservable(this, { nodes: false }, { autoBind: true });
		this.#put(newRoot());
	}

	/**
	 * Replace the in-memory outline with the stored one. Call before anything can
	 * edit. Repeat calls join the first read rather than re-running it, and a
	 * failed read leaves an empty outline instead of a broken app.
	 */
	hydrate(): Promise<void> {
		this.#hydration ??= this.#hydrate();
		return this.#hydration;
	}

	async #hydrate(): Promise<void> {
		let snapshot: OutlineSnapshot | null = null;
		try {
			snapshot = await this.#persistence.load();
		} catch {
			// Unreadable storage reads as an empty outline. Writes still go out;
			// whether they land is the adapter's business.
		}

		runInAction(() => {
			// An edit beat the read back. The user's typing wins over stale disk.
			if (snapshot && !this.#mutated) {
				this.#replace(snapshot.nodes);
			}
			this.hydrated = true;
		});
	}

	/**
	 * Write anything the adapter is holding back. Worth calling when the page is
	 * being hidden or unloaded; a no-op for adapters that write straight through.
	 */
	async flush(): Promise<void> {
		await this.#persistence.flush?.();
	}

	/** The shape `@cascade/ui` renders. Rebuilt whole on any change; the visible tree is small. */
	get tree(): OutlineNode[] {
		return this.#childrenOf(ROOT_ID);
	}

	create(parentId: string | null = null, index?: number): string {
		const parent = this.#resolveParent(parentId);
		if (!parent) {
			throw new Error(`create: unknown parent ${parentId}`);
		}

		const id = crypto.randomUUID();
		this.#put({
			id,
			parentId: parent.id,
			childIds: [],
			content: emptyState(),
			collapsed: false,
			updatedAt: Date.now(),
		});
		this.#insertChild(parent, id, index);
		this.#persist();
		return id;
	}

	setContent(id: string, content: SerializedEditorState): void {
		const node = this.#writable(id);
		if (!node) {
			return;
		}
		node.content = content;
		node.updatedAt = Date.now();
		this.#persist();
	}

	setCollapsed(id: string, collapsed: boolean): void {
		const node = this.#writable(id);
		if (!node) {
			return;
		}
		node.collapsed = collapsed;
		node.updatedAt = Date.now();
		this.#persist();
	}

	/**
	 * Reparent `id` under `newParentId` (`null` = top level) at `index`
	 * (default: append). Same-parent calls reorder. Returns `false` if the move
	 * is impossible: unknown node/parent, or `newParentId` is inside `id`'s own
	 * subtree.
	 */
	move(id: string, newParentId: string | null, index?: number): boolean {
		const node = this.#writable(id);
		if (!node) {
			return false;
		}

		const parent = this.#resolveParent(newParentId);
		if (!parent || parent.id === id || this.#isDescendant(parent.id, id)) {
			return false;
		}

		this.#detach(node);
		node.parentId = parent.id;
		node.updatedAt = Date.now();
		this.#insertChild(parent, id, index);
		this.#persist();
		return true;
	}

	/** Hard-delete `id` and its whole subtree. */
	remove(id: string): void {
		const node = this.#writable(id);
		if (!node) {
			return;
		}
		for (const descendantId of this.#subtree(id)) {
			this.nodes.delete(descendantId);
		}
		this.#detach(node);
		this.#persist();
	}

	/**
	 * Swap in a stored outline. The snapshot carries the synthetic root along
	 * with everything else, so ordering comes back with it; a snapshot without
	 * one (older build, truncated record) gets a fresh empty root rather than a
	 * map with no top level.
	 */
	#replace(nodes: Node[]): void {
		this.nodes.clear();
		for (const node of nodes) {
			this.#put({ ...node, childIds: [...node.childIds] });
		}
		if (!this.nodes.has(ROOT_ID)) {
			this.#put(newRoot());
		}
	}

	/** Make `node` observable (deep, except `content`) and register it. */
	#put(node: Node): Node {
		const registered = observable.object(node, { content: observable.ref });
		this.nodes.set(node.id, registered);
		return registered;
	}

	/** A node that exists and is not the synthetic root. */
	#writable(id: string): Node | undefined {
		if (id === ROOT_ID) {
			return undefined;
		}
		return this.nodes.get(id);
	}

	#resolveParent(parentId: string | null): Node | undefined {
		return this.nodes.get(parentId ?? ROOT_ID);
	}

	/** Drop `node` from its current parent's `childIds`. Leaves `node.parentId` for the caller to set. */
	#detach(node: Node): void {
		const parent = this.nodes.get(node.parentId ?? ROOT_ID);
		if (!parent) {
			return;
		}
		parent.childIds = parent.childIds.filter((childId) => childId !== node.id);
		parent.updatedAt = Date.now();
	}

	#insertChild(parent: Node, childId: string, index?: number): void {
		const without = parent.childIds.filter((each) => each !== childId);
		const at =
			index === undefined
				? without.length
				: Math.max(0, Math.min(index, without.length));
		without.splice(at, 0, childId);
		parent.childIds = without;
		parent.updatedAt = Date.now();
	}

	/** True if `ancestorId` is on the parent chain above `id`. */
	#isDescendant(id: string, ancestorId: string): boolean {
		let current = this.nodes.get(id)?.parentId ?? null;
		while (current !== null) {
			if (current === ancestorId) {
				return true;
			}
			current = this.nodes.get(current)?.parentId ?? null;
		}
		return false;
	}

	/** `id` plus every descendant, via `childIds`. */
	#subtree(id: string): string[] {
		const collected: string[] = [];
		const stack = [id];
		while (stack.length > 0) {
			const current = stack.pop();
			if (current === undefined) {
				continue;
			}
			collected.push(current);
			const node = this.nodes.get(current);
			if (node) {
				stack.push(...node.childIds);
			}
		}
		return collected;
	}

	#childrenOf(id: string): OutlineNode[] {
		const node = this.nodes.get(id);
		if (!node) {
			return [];
		}
		return node.childIds.flatMap((childId) => {
			const child = this.nodes.get(childId);
			if (!child) {
				return [];
			}
			return [
				{
					id: child.id,
					text: child.content,
					children: this.#childrenOf(child.id),
					collapsed: child.collapsed,
				},
			];
		});
	}

	#persist(): void {
		this.#mutated = true;
		// ponytail: whole-snapshot save, caller debounces. A diff/outbox is the
		// job of the sync layer, not this one.
		void this.#persistence.save(this.#snapshot()).catch(() => {});
	}

	/**
	 * Plain copies, not the observables themselves: MobX hands out proxies, and
	 * a proxy is not structured-cloneable, so IndexedDB would reject the write.
	 * `content` is already a plain ref, so it goes across as-is.
	 */
	#snapshot(): OutlineSnapshot {
		return {
			nodes: [...this.nodes.values()].map((node) => ({
				id: node.id,
				parentId: node.parentId,
				childIds: [...node.childIds],
				content: node.content,
				collapsed: node.collapsed,
				updatedAt: node.updatedAt,
			})),
		};
	}
}

function newRoot(): Node {
	return {
		id: ROOT_ID,
		parentId: null,
		childIds: [],
		content: emptyState(),
		collapsed: false,
		updatedAt: 0,
	};
}
