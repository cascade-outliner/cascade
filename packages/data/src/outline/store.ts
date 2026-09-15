import type { SerializedEditorState } from "lexical";
import {
	computed,
	type IComputedValue,
	makeAutoObservable,
	observable,
	runInAction,
	toJS,
} from "mobx";
import { MemoryPersistence } from "../persistence/memory.ts";
import type { OutlinePersistence } from "../persistence/types.ts";
import { orderBetween } from "../util/order.ts";
import { emptyState } from "./content.ts";
import {
	ancestorsOf,
	type Children,
	childrenOf,
	descendantsOf,
	indexChildren,
	indexOf,
	isDescendant,
	orderAt,
	rowsOf,
} from "./tree.ts";
import type { Node, Row } from "./types.ts";

/**
 * The outline, client-side and mutable.
 */
export class OutlineStore {
	readonly nodes = observable.map<string, Node>(undefined, { deep: false });
	readonly #persistence: OutlinePersistence;
	readonly #children: IComputedValue<Children>;
	readonly ready: Promise<void>;

	status: "loading" | "ready" = "loading";

	constructor(persistence: OutlinePersistence = new MemoryPersistence()) {
		this.#persistence = persistence;
		this.#children = computed(() => indexChildren(this.nodes.values()), {
			keepAlive: true,
		});
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
		return rowsOf(this.#tree, rootId);
	}

	/** `id`'s parent, or `null` if it's a root node or unknown. Used to zoom back out. */
	parentOf(id: string): string | null {
		return this.nodes.get(id)?.parentId ?? null;
	}

	/** `id`'s ancestors, from the tree's root down to its immediate parent. Used for the zoom breadcrumb. */
	ancestorsOf(id: string): Node[] {
		return ancestorsOf(this.nodes, id);
	}

	create(parentId: string | null = null): string {
		if (parentId !== null && !this.nodes.has(parentId)) {
			throw new Error(`create: unknown parent ${parentId}`);
		}

		const node = this.#put({
			id: crypto.randomUUID(),
			parentId,
			order: orderAt(this.#tree, parentId),
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
			order: orderAt(this.#tree, node.parentId, indexOf(this.#tree, node) + 1),
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
		const children = this.#tree;
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
			for (const child of childrenOf(children, source.id)) {
				previousOrder = orderBetween(previousOrder, undefined);
				clone(child, copy.id, previousOrder);
			}
			return copy;
		};

		const root = clone(
			node,
			node.parentId,
			orderAt(children, node.parentId, indexOf(children, node) + 1),
		);
		this.#persist(clones);
		return root.id;
	}

	/** Whether `id` has a previous sibling it could be nested under. */
	canIndent(id: string): boolean {
		const node = this.nodes.get(id);
		return node !== undefined && indexOf(this.#tree, node) > 0;
	}

	/** Makes `id` a child of its previous sibling. No-op if it has none. */
	indent(id: string): boolean {
		const node = this.nodes.get(id);
		if (!node) {
			return false;
		}
		const siblings = childrenOf(this.#tree, node.parentId);
		const previous = siblings[siblings.indexOf(node) - 1];
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
		return this.move(id, parent.parentId, indexOf(this.#tree, parent) + 1);
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
				isDescendant(this.nodes, newParentId, id))
		) {
			return false;
		}

		node.order = orderAt(this.#tree, newParentId, index, id);
		node.parentId = newParentId;
		node.updatedAt = Date.now();
		this.#persist([node]);
		return true;
	}

	remove(id: string): void {
		if (!this.nodes.has(id)) {
			return;
		}
		const ids = descendantsOf(this.#tree, id);
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

	/** The current children index. Reads are tracked by MobX like any observable. */
	get #tree(): Children {
		return this.#children.get();
	}

	#persist(put: Node[], remove: string[] = []): void {
		void this.#persistence
			.write({ put: put.map((node) => toJS(node)), delete: remove })
			.catch((error) => console.error("OutlineStore: write failed", error));
	}
}
