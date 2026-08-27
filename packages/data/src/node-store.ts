import type { OutlineNode } from "@cascade/ui";
import type { SerializedEditorState } from "lexical";
import {
	action,
	computed,
	makeObservable,
	observable,
	runInAction,
} from "mobx";
import { emptyState } from "./empty-content.ts";
import { NodeModel } from "./node.ts";
import { apply, reconcile } from "./outline/index.ts";
import {
	type NodePersistence,
	NodeRepository,
} from "./persistence/node-repository.ts";
import type { Mutation, NodeSnapshot } from "./types.ts";

export class NodeStore {
	readonly userId: string;
	readonly nodes = observable.map<string, NodeModel>();

	rootIds: string[] = [];
	hydrated = false;
	persistError: unknown = null;

	private readonly repository: NodePersistence;
	/** The plain source of truth. `nodes` is its observable projection. */
	private readonly snapshots = new Map<string, NodeSnapshot>();
	private readonly lookup = (id: string) => this.nodes.get(id);

	constructor(
		userId: string,
		repository: NodePersistence = new NodeRepository(),
	) {
		this.userId = userId;
		this.repository = repository;

		makeObservable(this, {
			rootIds: observable,
			hydrated: observable,
			persistError: observable.ref,
			rootNodes: computed,
			tree: computed,
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
					this.snapshots.set(snapshot.id, snapshot);
				}
			}

			this.rootIds = reconcile(this.snapshots, rootIds);
			for (const [id, snapshot] of this.snapshots) {
				this.nodes.set(id, new NodeModel(this.lookup, snapshot));
			}
			this.hydrated = true;
		});
	}

	reset(): void {
		this.nodes.clear();
		this.snapshots.clear();
		this.rootIds = [];
		this.hydrated = false;
		this.persistError = null;
	}

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
		const current = this.snapshots.get(id);
		if (!current) {
			return;
		}

		if (JSON.stringify(current.content) === JSON.stringify(content)) {
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

	move(id: string, parentId: string | null): void {
		this.applyMutation({ type: "node.move", at: Date.now(), id, parentId });
	}

	removeNode(id: string): void {
		this.applyMutation({ type: "node.delete", at: Date.now(), id });
	}

	/** The one funnel every write passes through. See `./README.md`. */
	private applyMutation(mutation: Mutation): void {
		const change = apply(
			{ userId: this.userId, nodes: this.snapshots, rootIds: this.rootIds },
			mutation,
		);
		if (!change) {
			return;
		}

		runInAction(() => {
			for (const id of change.touched) {
				this.reflect(id);
			}
			for (const id of change.removed) {
				this.nodes.delete(id);
			}
			if (change.rootIds) {
				this.rootIds = change.rootIds;
			}
		});

		void this.persist(change.writes, change.rootIds ?? undefined);
	}

	/** Bring the observable model for `id` in line with its snapshot. */
	private reflect(id: string): void {
		const snapshot = this.snapshots.get(id);
		if (!snapshot) {
			return;
		}

		const existing = this.nodes.get(id);
		if (existing) {
			existing.applySnapshot(snapshot);
		} else {
			this.nodes.set(id, new NodeModel(this.lookup, snapshot));
		}
	}

	private async persist(
		writes: NodeSnapshot[],
		rootIds?: string[],
	): Promise<void> {
		try {
			await this.repository.save(this.userId, writes, rootIds);
		} catch (error) {
			// The observable state has already moved on; surface the divergence
			// rather than throwing out of an action.
			runInAction(() => {
				this.persistError = error;
			});
			console.error("Failed to persist nodes", error);
		}
	}
}
