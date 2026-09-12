import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import type { SerializedEditorState } from "lexical";
import { makeAutoObservable, observable, runInAction, toJS } from "mobx";
import { emptyState } from "./empty-content.ts";
import type { Node, OutlineNode, OutlinePersistence } from "./types.ts";

const NOOP_PERSISTENCE: OutlinePersistence = {
	load: async () => [],
	write: async () => {},
};

function byOrder(a: Node, b: Node): number {
	return a.order < b.order ? -1 : a.order > b.order ? 1 : 0;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function orderBetween(prev?: string, next?: string): string {
	return generateKeyBetween(prev ?? null, next ?? null);
}

function backfillOrder(nodes: Node[]): Node[] {
	const last = new Map<string | null, string>();
	const missing = new Map<string | null, Node[]>();
	for (const node of nodes) {
		if (typeof node.order === "string") {
			const current = last.get(node.parentId);
			if (current === undefined || current < node.order) {
				last.set(node.parentId, node.order);
			}
		} else {
			const group = missing.get(node.parentId) ?? [];
			group.push(node);
			missing.set(node.parentId, group);
		}
	}
	const backfilled: Node[] = [];
	for (const [parentId, group] of missing) {
		const keys = generateNKeysBetween(
			last.get(parentId) ?? null,
			null,
			group.length,
		);
		group.forEach((node, position) => {
			node.order = keys[position];
			backfilled.push(node);
		});
	}
	return backfilled;
}

/**
 * The outline, client-side and mutable.
 *
 * TODO: two tabs each hold their own store and last write per node wins.
 */
export class OutlineStore {
	readonly nodes = observable.map<string, Node>(undefined, { deep: false });
	readonly #persistence: OutlinePersistence;
	status: "loading" | "ready" = "loading";

	constructor(persistence: OutlinePersistence = NOOP_PERSISTENCE) {
		this.#persistence = persistence;
		makeAutoObservable(this, { nodes: false }, { autoBind: true });
		void this.#load();
	}

	get tree(): OutlineNode[] {
		const children = this.#childrenByParent();
		for (const siblings of children.values()) {
			siblings.sort(byOrder);
		}
		const build = (parentId: string | null): OutlineNode[] =>
			(children.get(parentId) ?? []).map((node) => ({
				id: node.id,
				text: node.content,
				children: build(node.id),
				collapsed: node.collapsed,
				task: node.task,
			}));
		return build(null);
	}

	create(parentId: string | null = null): string {
		if (parentId !== null && !this.nodes.has(parentId)) {
			throw new Error(`create: unknown parent ${parentId}`);
		}

		const siblings = this.#siblings(parentId);
		const node = this.#put({
			id: crypto.randomUUID(),
			parentId,
			order: orderBetween(siblings.at(-1)?.order, undefined),
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
		const siblings = this.#siblings(node.parentId);
		const next = siblings[siblings.indexOf(node) + 1];
		const copy = this.#put({
			id: crypto.randomUUID(),
			parentId: node.parentId,
			order: orderBetween(node.order, next?.order),
			content: node.content,
			collapsed: false,
			task: node.task ? { ...node.task } : undefined,
			updatedAt: Date.now(),
		});
		this.#persist([copy]);
		return copy.id;
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

		const siblings = this.#siblings(newParentId).filter(
			(each) => each.id !== id,
		);
		const at =
			index === undefined ? siblings.length : clamp(index, 0, siblings.length);
		node.order = orderBetween(siblings[at - 1]?.order, siblings[at]?.order);
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
		const backfilled = backfillOrder(nodes);
		runInAction(() => {
			for (const node of nodes) {
				this.#put(node);
			}
			this.status = "ready";
		});
		if (backfilled.length > 0) {
			this.#persist(backfilled);
		}
	}

	#put(node: Node): Node {
		const registered = observable.object(node, { content: observable.ref });
		this.nodes.set(node.id, registered);
		return registered;
	}

	#siblings(parentId: string | null): Node[] {
		const siblings: Node[] = [];
		for (const node of this.nodes.values()) {
			if (node.parentId === parentId) {
				siblings.push(node);
			}
		}
		return siblings.sort(byOrder);
	}

	#childrenByParent(): Map<string | null, Node[]> {
		const groups = new Map<string | null, Node[]>();
		for (const node of this.nodes.values()) {
			const siblings = groups.get(node.parentId) ?? [];
			siblings.push(node);
			groups.set(node.parentId, siblings);
		}
		return groups;
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
		const children = this.#childrenByParent();
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
