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
import type {
	OutlineChange,
	OutlinePersistence,
} from "../persistence/types.ts";
import { orderBetween } from "../util/order.ts";
import { emptyState } from "./content.ts";
import { dayDate, isDailyNode, isDayId, openDay } from "./daily.ts";
import { type SearchResult, searchNodes } from "./search.ts";
import {
	ancestorsOf,
	breakCycles,
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

		persistence.subscribe?.((change) => runInAction(() => this.#merge(change)));
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

	/**
	 * Nodes matching every term of `query`, collapsed or not, best first.
	 * `within` keeps only `id`'s descendants; `excluding` drops them (and `id`).
	 */
	search(
		query: string,
		{
			limit = 20,
			within,
			excluding,
		}: { limit?: number; within?: string; excluding?: string } = {},
	): SearchResult {
		let nodes: Iterable<Node> = this.nodes.values();
		if (within !== undefined) {
			nodes = descendantsOf(this.#tree, within)
				.filter((id) => id !== within)
				.flatMap((id) => this.nodes.get(id) ?? []);
		} else if (excluding !== undefined) {
			const skip = new Set(descendantsOf(this.#tree, excluding));
			nodes = [...nodes].filter((node) => !skip.has(node.id));
		}
		return searchNodes(nodes, query, limit);
	}

	/**
	 * Whether `id` is a daily note (or the root, a year or a month above them). Those are fixed: their text,
	 * place and kind can't change (deleting is fine); add children instead.
	 */
	isLocked(id: string): boolean {
		return isDailyNode(id);
	}

	/** Adds a node under `parentId`, at `index` among its children (default: last). Returns its id. */
	create(
		parentId: string | null = null,
		{
			id = crypto.randomUUID(),
			index,
			content = emptyState(),
		}: { id?: string; index?: number; content?: SerializedEditorState } = {},
	): string {
		// A day note only exists once something is added under it.
		if (parentId !== null && !this.nodes.has(parentId) && isDayId(parentId)) {
			openDay(this, dayDate(parentId));
		}
		if (parentId !== null && !this.nodes.has(parentId)) {
			throw new Error(`create: unknown parent ${parentId}`);
		}

		const node = this.#put({
			id,
			parentId,
			order: orderAt(this.#tree, parentId, index),
			content,
			collapsed: false,
			updatedAt: Date.now(),
		});
		this.#persist([node]);
		return node.id;
	}

	setContent(id: string, content: SerializedEditorState): void {
		const node = this.nodes.get(id);
		if (!node || this.isLocked(id)) {
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
		if (!node || this.isLocked(id)) {
			return;
		}
		node.task = task ?? undefined;
		node.updatedAt = Date.now();
		this.#persist([node]);
	}

	/** Sets or clears (`null`) `id`'s due date, a `YYYY-MM-DD` day. */
	setDue(id: string, due: string | null): void {
		const node = this.nodes.get(id);
		if (!node || this.isLocked(id)) {
			return;
		}
		node.due = due ?? undefined;
		node.updatedAt = Date.now();
		this.#persist([node]);
	}

	/**
	 * Nodes due on `day` (`YYYY-MM-DD`), in outline order. `excluding` drops
	 * `id` and its descendants, e.g. the day's own note.
	 */
	dueOn(day: string, { excluding }: { excluding?: string } = {}): Node[] {
		const skip = new Set(
			excluding === undefined ? [] : descendantsOf(this.#tree, excluding),
		);
		const due = new Set<string>();
		for (const node of this.nodes.values()) {
			if (node.due === day && !skip.has(node.id)) {
				due.add(node.id);
			}
		}
		// ponytail: scans every node per call; index nodes by due date if outlines get huge.
		return this.#documentOrder(due).flatMap((id) => this.nodes.get(id) ?? []);
	}

	/** Copies a node (not its descendants) as a new sibling. Returns the new id, or `null` if `id` is unknown. */
	duplicate(id: string): string | null {
		const node = this.nodes.get(id);
		if (!node || this.isLocked(id)) {
			return null;
		}
		const copy = this.#put({
			id: crypto.randomUUID(),
			parentId: node.parentId,
			order: orderAt(this.#tree, node.parentId, indexOf(this.#tree, node) + 1),
			content: node.content,
			collapsed: false,
			task: node.task ? { ...node.task } : undefined,
			due: node.due,
			updatedAt: Date.now(),
		});
		this.#persist([copy]);
		return copy.id;
	}

	/** Copies a node and all its descendants as a new sibling subtree. Returns the new root id, or `null` if `id` is unknown. */
	duplicateWithChildren(id: string): string | null {
		const node = this.nodes.get(id);
		if (!node || this.isLocked(id)) {
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
				due: source.due,
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
		return (
			node !== undefined && !this.isLocked(id) && indexOf(this.#tree, node) > 0
		);
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
		return (
			!this.isLocked(id) && (this.nodes.get(id)?.parentId ?? null) !== null
		);
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
		// Daily nodes stay put.
		if (!node || this.isLocked(id)) {
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

	setTaskMany(ids: Iterable<string>, task: { done: boolean } | null): void {
		for (const id of ids) {
			this.setTask(id, task);
		}
	}

	setDueMany(ids: Iterable<string>, due: string | null): void {
		for (const id of ids) {
			this.setDue(id, due);
		}
	}

	/**
	 * Duplicates each node in `ids` next to itself. With `withChildren`, nodes
	 * whose ancestor is also in `ids` are skipped: the ancestor's copy already holds them.
	 */
	duplicateMany(ids: Iterable<string>, withChildren = false): void {
		const wanted = new Set(ids);
		for (const id of this.#documentOrder(wanted)) {
			if (
				withChildren &&
				this.ancestorsOf(id).some((ancestor) => wanted.has(ancestor.id))
			) {
				continue;
			}
			if (withChildren) {
				this.duplicateWithChildren(id);
			} else {
				this.duplicate(id);
			}
		}
	}

	/** Indents each node in `ids`, top to bottom, so selected siblings end up nested together in order. */
	indentMany(ids: Iterable<string>): void {
		for (const id of this.#documentOrder(new Set(ids))) {
			this.indent(id);
		}
	}

	/** Outdents each node in `ids`, bottom to top, so they keep their order after the former parent. */
	outdentMany(ids: Iterable<string>): void {
		for (const id of this.#documentOrder(new Set(ids)).reverse()) {
			this.outdent(id);
		}
	}

	remove(id: string): void {
		this.removeMany([id]);
	}

	/** Removes every node in `ids` and their descendants, in one write. */
	removeMany(ids: Iterable<string>): void {
		// A Set: a selected parent and its selected child share descendants.
		const all = new Set<string>();
		for (const id of ids) {
			if (this.nodes.has(id)) {
				for (const each of descendantsOf(this.#tree, id)) {
					all.add(each);
				}
			}
		}
		if (all.size === 0) {
			return;
		}
		for (const id of all) {
			this.nodes.delete(id);
		}
		this.#persist([], [...all]);
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
			this.#merge({ put: nodes, delete: [] });
			this.status = "ready";
		});
	}

	/**
	 * Applies a change made elsewhere (loaded, or written by another tab).
	 * The newer `updatedAt` wins per node; cycles the change forms are broken.
	 */
	#merge(change: OutlineChange): void {
		for (const node of change.put) {
			const current = this.nodes.get(node.id);
			if (!current || current.updatedAt <= node.updatedAt) {
				this.#put(node);
			}
		}
		for (const id of change.delete) {
			this.nodes.delete(id);
		}
		const fixed = breakCycles(this.nodes);
		if (fixed.length > 0) {
			for (const node of fixed) {
				node.updatedAt = Date.now();
			}
			this.#persist(fixed);
		}
	}

	#put(node: Node): Node {
		const registered = observable.object(node, { content: observable.ref });
		this.nodes.set(node.id, registered);
		return registered;
	}

	/** `ids` in outline order (depth-first, collapsed or not). Unknown ids are dropped. */
	#documentOrder(ids: ReadonlySet<string>): string[] {
		const ordered: string[] = [];
		const walk = (parentId: string | null) => {
			for (const child of childrenOf(this.#tree, parentId)) {
				if (ids.has(child.id)) {
					ordered.push(child.id);
				}
				walk(child.id);
			}
		};
		walk(null);
		return ordered;
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
