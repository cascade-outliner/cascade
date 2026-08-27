import type { OutlineNode } from "@cascade/ui";
import type { SerializedEditorState } from "lexical";
import { makeAutoObservable, observable, runInAction } from "mobx";
import { emptyState } from "./empty-content.ts";
import { createMemoryPersistence } from "./persistence/memory.ts";
import type {
	OutlinePersistence,
	OutlineSnapshot,
} from "./persistence/types.ts";
import type { Node } from "./types.ts";

/**
 * Synthetic parent for top-level nodes. Its `childIds` is the top-level order,
 * so there is one ordering code path instead of a `rootIds` field plus an
 * "is this a root?" branch in every mutation. Never rendered, never exposed:
 * the public API uses `parentId: null` to mean "top level".
 */
const ROOT_ID = "__root__";

export interface OutlineStoreOptions {
	/**
	 * Where the outline is loaded from and saved to. Injected rather than
	 * imported because the answer depends on where the store is running:
	 * `createDefaultPersistence()` picks IndexedDB in the browser and memory
	 * during SSR. Defaults to memory, so a store constructed with no arguments
	 * still works everywhere.
	 */
	persistence?: OutlinePersistence;
	/**
	 * Called when a save fails - a full disk, a revoked storage permission.
	 * Edits stay in memory and the next save retries them, so this is where an
	 * app tells the user their work is not reaching disk.
	 */
	onPersistError?: (error: unknown) => void;
}

/**
 * The outline, client-side and mutable. MobX-observable: `observer` components
 * that read `tree` re-render on any change. Persistence is a constructor
 * argument (see `OutlineStoreOptions`); the store itself knows nothing about
 * IndexedDB.
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
	 * False until `hydrate()` has finished. Rendering before then shows an empty
	 * outline that is about to be replaced, so UI should wait on this.
	 */
	hydrated = false;

	/**
	 * True when saving is switched off because the stored outline could not be
	 * read. Writing on top of a failed load would replace data that is probably
	 * still there, so the store keeps edits in memory instead and leaves the
	 * decision to the app. A later successful `hydrate()` clears it.
	 */
	persistenceSuspended = false;

	readonly #persistence: OutlinePersistence;
	readonly #onPersistError: (error: unknown) => void;
	#hydration: Promise<void> | null = null;
	/** The newest snapshot not yet handed to the adapter, if any. */
	#pending: OutlineSnapshot | null = null;
	#draining = false;
	#drained: Promise<void> = Promise.resolve();
	#lastStamp = 0;

	constructor({ persistence, onPersistError }: OutlineStoreOptions = {}) {
		this.#persistence = persistence ?? createMemoryPersistence();
		this.#onPersistError = onPersistError ?? (() => {});
		makeAutoObservable(this, { nodes: false }, { autoBind: true });
		this.#put({
			id: ROOT_ID,
			parentId: null,
			childIds: [],
			content: emptyState(),
			collapsed: false,
			updatedAt: 0,
		});
	}

	/** The shape `@cascade/ui` renders. Rebuilt whole on any change; the visible tree is small. */
	get tree(): OutlineNode[] {
		return this.#childrenOf(ROOT_ID);
	}

	/**
	 * Load the stored outline and replace what is in memory with it. Call once
	 * at startup, before the store is edited: this is a replace, not a merge.
	 * Repeat and concurrent calls share the first call's work.
	 *
	 * Rejects if the adapter cannot be read, having suspended saving first.
	 * Calling again retries; a store that never hydrates simply starts empty.
	 */
	hydrate(): Promise<void> {
		this.#hydration ??= this.#load();
		return this.#hydration;
	}

	/**
	 * Resolves once every edit made so far has reached the adapter. Editing does
	 * not need to wait on this - the outline is already in memory - but "is it
	 * safe to close the tab" checks and tests do.
	 */
	async whenPersisted(): Promise<void> {
		while (this.#draining) {
			await this.#drained;
		}
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
			updatedAt: this.#stamp(),
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
		node.updatedAt = this.#stamp();
		this.#persist();
	}

	setCollapsed(id: string, collapsed: boolean): void {
		const node = this.#writable(id);
		if (!node) {
			return;
		}
		node.collapsed = collapsed;
		node.updatedAt = this.#stamp();
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
		node.updatedAt = this.#stamp();
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

	async #load(): Promise<void> {
		try {
			const snapshot = await this.#persistence.load();
			runInAction(() => {
				if (snapshot) {
					this.#replace(snapshot);
				}
				this.persistenceSuspended = false;
				this.hydrated = true;
			});
		} catch (error) {
			runInAction(() => {
				this.persistenceSuspended = true;
			});
			this.#hydration = null;
			throw error;
		}
	}

	/** Swap in a stored outline wholesale. Deliberately does not persist: nothing changed. */
	#replace(snapshot: OutlineSnapshot): void {
		this.nodes.clear();
		for (const node of snapshot.nodes) {
			this.#put({ ...node, childIds: [...node.childIds] });
			this.#lastStamp = Math.max(this.#lastStamp, node.updatedAt);
		}

		// Every snapshot the store writes contains the synthetic root. One that
		// does not is damaged, and without it the top-level order - and so the
		// whole outline - would be invisible, so rebuild it from the nodes that
		// still claim it as their parent rather than dropping them.
		if (!this.nodes.has(ROOT_ID)) {
			this.#put({
				id: ROOT_ID,
				parentId: null,
				childIds: snapshot.nodes
					.filter((node) => node.parentId === ROOT_ID)
					.map((node) => node.id),
				content: emptyState(),
				collapsed: false,
				updatedAt: 0,
			});
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
		parent.updatedAt = this.#stamp();
	}

	#insertChild(parent: Node, childId: string, index?: number): void {
		const without = parent.childIds.filter((each) => each !== childId);
		const at =
			index === undefined
				? without.length
				: Math.max(0, Math.min(index, without.length));
		without.splice(at, 0, childId);
		parent.childIds = without;
		parent.updatedAt = this.#stamp();
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

	/**
	 * The timestamp for one write. Monotonic rather than raw `Date.now()`, so
	 * two writes in the same millisecond still differ and `updatedAt` can serve
	 * as a change token - which is exactly how the IndexedDB adapter decides
	 * what to rewrite.
	 */
	#stamp(): number {
		const now = Date.now();
		this.#lastStamp = now > this.#lastStamp ? now : this.#lastStamp + 1;
		return this.#lastStamp;
	}

	/**
	 * Hand the current outline to the adapter, coalescing: at most one save is
	 * in flight and only the newest snapshot follows it, because each one is
	 * complete and supersedes the ones before it. A diff/outbox is the job of
	 * the sync layer, not this one.
	 */
	#persist(): void {
		if (this.persistenceSuspended) {
			return;
		}
		this.#pending = this.#snapshot();
		if (this.#draining) {
			return;
		}
		// Flagged before starting, cleared inside `#drain` rather than in a
		// `finally` on the promise, so an edit arriving between the drain's last
		// check and its resolution starts a new drain instead of being stranded.
		this.#draining = true;
		this.#drained = this.#drain();
	}

	async #drain(): Promise<void> {
		try {
			while (this.#pending) {
				const snapshot = this.#pending;
				this.#pending = null;
				try {
					await this.#persistence.save(snapshot);
				} catch (error) {
					this.#onPersistError(error);
				}
			}
		} finally {
			this.#draining = false;
		}
	}

	/**
	 * Plain copies of every node. Adapters read these after an await and may
	 * structured-clone them, and MobX proxies survive neither: they keep
	 * changing underneath the reader, and `structuredClone` rejects them.
	 * `content` is shared by reference - `setContent` replaces it wholesale
	 * instead of mutating it, so the copy stays accurate.
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
