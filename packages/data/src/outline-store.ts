import { generateKeyBetween } from "fractional-indexing";
import type { SerializedEditorState } from "lexical";
import {
	computed,
	type IComputedValue,
	makeAutoObservable,
	observable,
	runInAction,
	toJS,
} from "mobx";
import { emptyState } from "./empty-content.ts";
import { MemoryPersistence } from "./memory-persistence.ts";
import type { Node, OutlinePersistence, Row } from "./types.ts";

type Children = Map<string | null, Node[]>;

function byOrder(a: Node, b: Node): number {
	return a.order < b.order ? -1 : a.order > b.order ? 1 : 0;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function orderBetween(prev?: string, next?: string): string {
	return generateKeyBetween(prev ?? null, next ?? null);
}

/**
 * The outline, client-side and mutable.
 *
 * TODO: two tabs each hold their own store and last write per node wins.
 */
export class OutlineStore {
	readonly nodes = observable.map<string, Node>(undefined, { deep: false });
	readonly #persistence: OutlinePersistence;
	/** Every node's children, sorted. The single index behind all tree queries. */
	readonly #children: IComputedValue<Children>;
	/** Resolves once `load` has finished, whether or not it succeeded. */
	readonly ready: Promise<void>;
	/**
	 * `"loading"` until persistence has been read. Mutations made meanwhile are
	 * not guarded: stored nodes are added on top of them when the load resolves.
	 */
	status: "loading" | "ready" = "loading";

	constructor(persistence: OutlinePersistence = new MemoryPersistence()) {
		this.#persistence = persistence;
		this.#children = computed(() => this.#index(), { keepAlive: true });
		makeAutoObservable(this, { nodes: false }, { autoBind: true });
		this.ready = this.#load();
	}

	get size(): number {
		return this.nodes.size;
	}

	get(id: string): Node | undefined {
		return this.nodes.get(id);
	}

	/**
	 * The visible rows below `rootId` (the whole outline when `null`), depth-first.
	 * Children of collapsed nodes are left out.
	 */
	// ponytail: not memoised per rootId; computedFn from mobx-utils if the walk shows up in profiles.
	rows(rootId: string | null = null): Row[] {
		const children = this.#children.get();
		const rows: Row[] = [];
		const walk = (parentId: string | null, depth: number) => {
			for (const node of children.get(parentId) ?? []) {
				const childCount = children.get(node.id)?.length ?? 0;
				rows.push({ node, depth, childCount });
				if (childCount > 0 && !node.collapsed) {
					walk(node.id, depth + 1);
				}
			}
		};
		walk(rootId, 0);
		return rows;
	}

	/** `id`'s parent, or `null` if it's a root node or unknown. Used to zoom back out. */
	parentOf(id: string): string | null {
		return this.nodes.get(id)?.parentId ?? null;
	}

	create(parentId: string | null = null): string {
		if (parentId !== null && !this.nodes.has(parentId)) {
			throw new Error(`create: unknown parent ${parentId}`);
		}

		const node = this.#put({
			id: crypto.randomUUID(),
			parentId,
			order: this.#orderAt(parentId),
			content: emptyState(),
			collapsed: false,
			updatedAt: Date.now(),
		});
		this.#persist([node]);
		return node.id;
	}

	setContent(id: string, content: SerializedEditorState): void {
		const node = this.nodes.get(id);
		if (!node) {
			return;
		}
		node.content = content;
		node.updatedAt = Date.now();
		// TODO: trailing debounce if one put per keystroke ever shows up in profiles.
		this.#persist([node]);
	}

	setCollapsed(id: string, collapsed: boolean): void {
		const node = this.nodes.get(id);
		if (!node) {
			return;
		}
		node.collapsed = collapsed;
		node.updatedAt = Date.now();
		this.#persist([node]);
	}

	setTask(id: string, task: { done: boolean } | null): void {
		const node = this.nodes.get(id);
		if (!node) {
			return;
		}
		node.task = task ?? undefined;
		node.updatedAt = Date.now();
		this.#persist([node]);
	}

	/** Copies a node (not its descendants) as a new sibling. Returns the new id, or `null` if `id` is unknown. */
	duplicate(id: string): string | null {
		const node = this.nodes.get(id);
		if (!node) {
			return null;
		}
		const copy = this.#put({
			id: crypto.randomUUID(),
			parentId: node.parentId,
			order: this.#orderAt(node.parentId, this.#indexOf(node) + 1),
			content: node.content,
			collapsed: false,
			task: node.task ? { ...node.task } : undefined,
			updatedAt: Date.now(),
		});
		this.#persist([copy]);
		return copy.id;
	}

	/** Copies a node and all its descendants as a new sibling subtree. Returns the new root id, or `null` if `id` is unknown. */
	duplicateWithChildren(id: string): string | null {
		const node = this.nodes.get(id);
		if (!node) {
			return null;
		}
		// Snapshot: clones are put while walking, and must not be walked themselves.
		const children = this.#children.get();
		const clones: Node[] = [];

		const clone = (
			source: Node,
			parentId: string | null,
			order: string,
		): Node => {
			const copy = this.#put({
				id: crypto.randomUUID(),
				parentId,
				order,
				content: source.content,
				collapsed: source.collapsed,
				task: source.task ? { ...source.task } : undefined,
				updatedAt: Date.now(),
			});
			clones.push(copy);
			let previousOrder: string | undefined;
			for (const child of children.get(source.id) ?? []) {
				previousOrder = orderBetween(previousOrder, undefined);
				clone(child, copy.id, previousOrder);
			}
			return copy;
		};

		const root = clone(
			node,
			node.parentId,
			this.#orderAt(node.parentId, this.#indexOf(node) + 1),
		);
		this.#persist(clones);
		return root.id;
	}

	/** Whether `id` has a previous sibling it could be nested under. */
	canIndent(id: string): boolean {
		const node = this.nodes.get(id);
		return node !== undefined && this.#indexOf(node) > 0;
	}

	/** Makes `id` a child of its previous sibling. No-op if it has none. */
	indent(id: string): boolean {
		const node = this.nodes.get(id);
		if (!node) {
			return false;
		}
		const previous = this.#siblings(node.parentId)[this.#indexOf(node) - 1];
		if (!previous) {
			return false;
		}
		return this.move(id, previous.id);
	}

	/** Whether `id` has a parent it could be moved out of. */
	canOutdent(id: string): boolean {
		return (this.nodes.get(id)?.parentId ?? null) !== null;
	}

	/** Moves `id` out to its parent's level, right after its former parent. No-op for a root node. */
	outdent(id: string): boolean {
		const node = this.nodes.get(id);
		if (!node || node.parentId === null) {
			return false;
		}
		const parent = this.nodes.get(node.parentId);
		if (!parent) {
			return false;
		}
		return this.move(id, parent.parentId, this.#indexOf(parent) + 1);
	}

	move(id: string, newParentId: string | null, index?: number): boolean {
		const node = this.nodes.get(id);
		if (!node) {
			return false;
		}
		if (
			newParentId !== null &&
			(newParentId === id ||
				!this.nodes.has(newParentId) ||
				this.#isDescendant(newParentId, id))
		) {
			return false;
		}

		node.order = this.#orderAt(newParentId, index, id);
		node.parentId = newParentId;
		node.updatedAt = Date.now();
		this.#persist([node]);
		return true;
	}

	remove(id: string): void {
		if (!this.nodes.has(id)) {
			return;
		}
		const ids = this.#subtree(id);
		for (const each of ids) {
			this.nodes.delete(each);
		}
		this.#persist([], ids);
	}

	/** Removes every node in the outline. */
	clearAll(): void {
		const ids = [...this.nodes.keys()];
		this.nodes.clear();
		this.#persist([], ids);
	}

	async #load(): Promise<void> {
		let nodes: Node[] = [];
		try {
			nodes = await this.#persistence.load();
		} catch (error) {
			console.error("OutlineStore: load failed, starting empty", error);
		}
		runInAction(() => {
			for (const node of nodes) {
				this.#put(node);
			}
			this.status = "ready";
		});
	}

	#put(node: Node): Node {
		const registered = observable.object(node, { content: observable.ref });
		this.nodes.set(node.id, registered);
		return registered;
	}

	#index(): Children {
		const groups: Children = new Map();
		for (const node of this.nodes.values()) {
			const siblings = groups.get(node.parentId) ?? [];
			siblings.push(node);
			groups.set(node.parentId, siblings);
		}
		for (const siblings of groups.values()) {
			siblings.sort(byOrder);
		}
		return groups;
	}

	#siblings(parentId: string | null): Node[] {
		return this.#children.get().get(parentId) ?? [];
	}

	#indexOf(node: Node): number {
		return this.#siblings(node.parentId).indexOf(node);
	}

	/**
	 * The order key that places a node at `index` among `parentId`'s children
	 * (appended when omitted), ignoring `excluding` if it's already there.
	 */
	#orderAt(
		parentId: string | null,
		index?: number,
		excluding?: string,
	): string {
		const siblings = this.#siblings(parentId).filter(
			(each) => each.id !== excluding,
		);
		const at =
			index === undefined ? siblings.length : clamp(index, 0, siblings.length);
		return orderBetween(siblings[at - 1]?.order, siblings[at]?.order);
	}

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

	/** `id` plus every descendant. */
	#subtree(id: string): string[] {
		const children = this.#children.get();
		const collected: string[] = [];
		const stack = [id];
		for (
			let current = stack.pop();
			current !== undefined;
			current = stack.pop()
		) {
			collected.push(current);
			for (const child of children.get(current) ?? []) {
				stack.push(child.id);
			}
		}
		return collected;
	}

	#persist(put: Node[], remove: string[] = []): void {
		void this.#persistence
			.write({ put: put.map((node) => toJS(node)), delete: remove })
			.catch((error) => console.error("OutlineStore: write failed", error));
	}
}
