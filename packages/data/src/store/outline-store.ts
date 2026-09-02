import type { OutlineNode } from "@cascade/ui";
import type { SerializedEditorState } from "lexical";
import {
	action,
	computed,
	type IComputedValue,
	makeObservable,
	observable,
} from "mobx";
import { emptyState } from "../empty-content.ts";
import { NodeModel } from "../model/node-model.ts";
import type { SyncAction } from "../sync/protocol.ts";
import {
	createTransaction,
	deleteTransaction,
	NOOP_SINK,
	type Transaction,
	type TransactionSink,
	updateTransaction,
} from "../sync/transaction.ts";
import type { NodeData, NodePatch } from "../types.ts";

export class OutlineStore {
	readonly nodes = observable.map<string, NodeModel>(undefined, {
		deep: false,
	});
	lastSyncId = 0;

	readonly #sink: TransactionSink;
	readonly #childrenByParent: IComputedValue<Map<string | null, NodeModel[]>>;

	constructor(sink: TransactionSink = NOOP_SINK) {
		this.#sink = sink;
		this.#childrenByParent = computed(() => {
			const index = new Map<string | null, NodeModel[]>();
			for (const node of this.nodes.values()) {
				const siblings = index.get(node.parentId);
				if (siblings) {
					siblings.push(node);
				} else {
					index.set(node.parentId, [node]);
				}
			}
			for (const siblings of index.values()) {
				siblings.sort((a, b) => a.sortOrder - b.sortOrder);
			}
			return index;
		});
		makeObservable(this, {
			lastSyncId: observable,
			tree: computed,
			create: action,
			setContent: action,
			setCollapsed: action,
			move: action,
			remove: action,
			hydrate: action,
			applySyncActions: action,
			reapply: action,
			revert: action,
		});
	}

	get tree(): OutlineNode[] {
		return this.#treeOf(null);
	}

	get(id: string): NodeModel | undefined {
		return this.nodes.get(id);
	}

	childrenOf(parentId: string | null): NodeModel[] {
		return this.#childrenByParent.get().get(parentId) ?? [];
	}

	create(parentId: string | null = null, index?: number): string {
		if (parentId !== null && !this.nodes.has(parentId)) {
			throw new Error(`create: unknown parent ${parentId}`);
		}
		const node = new NodeModel({
			id: crypto.randomUUID(),
			parentId,
			sortOrder: this.#sortOrderAt(parentId, index),
			content: emptyState(),
			collapsed: false,
			updatedAt: Date.now(),
		});
		this.nodes.set(node.id, node);
		this.#sink.push(createTransaction(node.toData()));
		return node.id;
	}

	setContent(id: string, content: SerializedEditorState): void {
		const node = this.nodes.get(id);
		if (!node) {
			return;
		}
		this.#update(node, { content });
	}

	setCollapsed(id: string, collapsed: boolean): void {
		const node = this.nodes.get(id);
		if (!node || node.collapsed === collapsed) {
			return;
		}
		this.#update(node, { collapsed });
	}

	move(id: string, newParentId: string | null, index?: number): boolean {
		const node = this.nodes.get(id);
		if (!node) {
			return false;
		}
		if (newParentId !== null) {
			if (
				newParentId === id ||
				!this.nodes.has(newParentId) ||
				this.#isDescendant(newParentId, id)
			) {
				return false;
			}
		}
		const sortOrder = this.#sortOrderAt(newParentId, index, id);
		this.#update(node, { parentId: newParentId, sortOrder });
		return true;
	}

	remove(id: string): void {
		if (!this.nodes.has(id)) {
			return;
		}
		for (const node of this.#subtree(id).reverse()) {
			this.nodes.delete(node.id);
			this.#sink.push(deleteTransaction(node.toData()));
		}
	}

	hydrate(nodes: NodeData[], lastSyncId: number): void {
		this.nodes.clear();
		for (const data of nodes) {
			this.nodes.set(data.id, new NodeModel(data));
		}
		this.lastSyncId = lastSyncId;
	}

	applySyncActions(actions: SyncAction[]): void {
		for (const each of actions) {
			if (each.id <= this.lastSyncId) {
				continue;
			}
			switch (each.action) {
				case "I":
				case "U":
					this.#upsert(each.modelId, each.data);
					break;
				case "D":
					this.nodes.delete(each.modelId);
					break;
			}
			this.lastSyncId = each.id;
		}
	}

	reapply(transaction: Transaction): void {
		switch (transaction.kind) {
			case "create":
				if (!this.nodes.has(transaction.modelId)) {
					this.nodes.set(transaction.modelId, new NodeModel(transaction.data));
				}
				break;
			case "update":
				this.nodes.get(transaction.modelId)?.patch(transaction.changes);
				break;
			case "delete":
				this.nodes.delete(transaction.modelId);
				break;
		}
	}

	revert(transaction: Transaction): void {
		switch (transaction.kind) {
			case "create":
				this.nodes.delete(transaction.modelId);
				break;
			case "update":
				this.nodes.get(transaction.modelId)?.patch(transaction.previous);
				break;
			case "delete":
				if (!this.nodes.has(transaction.modelId)) {
					this.nodes.set(
						transaction.modelId,
						new NodeModel(transaction.previous),
					);
				}
				break;
		}
	}

	#update(node: NodeModel, changes: NodePatch): void {
		const patch: NodePatch = { ...changes, updatedAt: Date.now() };
		const keys = Object.keys(patch) as Array<keyof NodePatch>;
		const previous = node.pick(keys);
		node.patch(patch);
		this.#sink.push(updateTransaction(node.id, patch, previous));
	}

	#upsert(id: string, data: NodePatch | NodeData): void {
		const existing = this.nodes.get(id);
		if (existing) {
			existing.patch(data);
			return;
		}
		if (!isNodeData(data)) {
			return;
		}
		this.nodes.set(id, new NodeModel({ ...data, id }));
	}

	#sortOrderAt(
		parentId: string | null,
		index: number | undefined,
		excludeId?: string,
	): number {
		const siblings = this.childrenOf(parentId).filter(
			(each) => each.id !== excludeId,
		);
		const at =
			index === undefined
				? siblings.length
				: Math.max(0, Math.min(index, siblings.length));
		const before = siblings[at - 1]?.sortOrder;
		const after = siblings[at]?.sortOrder;

		if (before === undefined && after === undefined) {
			return 0;
		}
		if (before === undefined) {
			return (after as number) - 1;
		}
		if (after === undefined) {
			return before + 1;
		}
		const between = (before + after) / 2;
		if (between > before && between < after) {
			return between;
		}
		this.#rebalance(siblings);
		return at - 0.5;
	}

	#rebalance(siblings: NodeModel[]): void {
		siblings.forEach((node, position) => {
			if (node.sortOrder !== position) {
				this.#update(node, { sortOrder: position });
			}
		});
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

	#subtree(id: string): NodeModel[] {
		const root = this.nodes.get(id);
		if (!root) {
			return [];
		}
		const collected: NodeModel[] = [];
		const stack = [root];
		while (stack.length > 0) {
			const current = stack.pop() as NodeModel;
			collected.push(current);
			stack.push(...this.childrenOf(current.id));
		}
		return collected;
	}

	#treeOf(parentId: string | null): OutlineNode[] {
		return this.childrenOf(parentId).map((node) => ({
			id: node.id,
			text: node.content,
			children: this.#treeOf(node.id),
			collapsed: node.collapsed,
		}));
	}
}

function isNodeData(data: NodePatch | NodeData): data is NodeData {
	return (
		data.parentId !== undefined &&
		data.sortOrder !== undefined &&
		data.content !== undefined &&
		data.collapsed !== undefined &&
		data.updatedAt !== undefined
	);
}
