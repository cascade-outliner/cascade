import {
	action,
	computed,
	makeObservable,
	observable,
	runInAction,
} from "mobx";
import type { OutlineStore } from "../store/outline-store.ts";
import type { DeltaPacket, SyncTransport } from "./protocol.ts";
import type { TransactionQueue } from "./transaction-queue.ts";

export type SyncStatus =
	| "idle"
	| "bootstrapping"
	| "ready"
	| "offline"
	| "error";

export interface SyncClientOptions {
	store: OutlineStore;
	queue: TransactionQueue;
	transport: SyncTransport;
	retryDelayMs?: number;
	maxRetryDelayMs?: number;
}

export class SyncClient {
	status: SyncStatus = "idle";
	lastError: string | null = null;

	readonly store: OutlineStore;
	readonly queue: TransactionQueue;
	readonly transport: SyncTransport;

	readonly #retryDelayMs: number;
	readonly #maxRetryDelayMs: number;
	#retryDelay: number;
	#retryTimer: ReturnType<typeof setTimeout> | null = null;
	#unsubscribe: (() => void) | null = null;
	#flushing: Promise<void> | null = null;
	#generation = 0;

	constructor(options: SyncClientOptions) {
		this.store = options.store;
		this.queue = options.queue;
		this.transport = options.transport;
		this.#retryDelayMs = options.retryDelayMs ?? 1_000;
		this.#maxRetryDelayMs = options.maxRetryDelayMs ?? 30_000;
		this.#retryDelay = this.#retryDelayMs;
		makeObservable(this, {
			status: observable,
			lastError: observable,
			pendingCount: computed,
			lastSyncId: computed,
			applyDelta: action,
			rebase: action,
		});
		this.queue.onBatchReady(() => {
			void this.flush();
		});
	}

	get pendingCount(): number {
		return this.queue.pendingCount;
	}

	get lastSyncId(): number {
		return this.store.lastSyncId;
	}

	async start(): Promise<void> {
		const generation = ++this.#generation;
		this.#setStatus("bootstrapping");
		try {
			const result = await this.transport.bootstrap();
			if (generation !== this.#generation) {
				return;
			}
			runInAction(() => {
				this.store.hydrate(result.nodes, result.lastSyncId);
				this.rebase();
			});
			this.#unsubscribe = this.transport.subscribe((packet) =>
				this.applyDelta(packet),
			);
			this.#setStatus("ready");
			await this.flush();
		} catch (error) {
			if (generation !== this.#generation) {
				return;
			}
			this.#setStatus("error", describe(error));
		}
	}

	stop(): void {
		this.#generation++;
		this.#unsubscribe?.();
		this.#unsubscribe = null;
		this.#clearRetry();
		this.#setStatus("idle");
	}

	async catchUp(): Promise<void> {
		const packet = await this.transport.delta(this.store.lastSyncId);
		this.applyDelta(packet);
	}

	flush(): Promise<void> {
		if (this.#flushing) {
			return this.#flushing;
		}
		if (this.status !== "ready" || this.#retryTimer) {
			return Promise.resolve();
		}
		this.#flushing = this.#drain().finally(() => {
			this.#flushing = null;
		});
		return this.#flushing;
	}

	applyDelta(packet: DeltaPacket): void {
		if (packet.actions.length === 0) {
			return;
		}
		const actions = [...packet.actions].sort((a, b) => a.id - b.id);
		this.store.applySyncActions(actions);
		this.queue.markSynced(this.store.lastSyncId);
		this.rebase();
	}

	rebase(): void {
		for (const transaction of this.queue.inFlight()) {
			this.store.reapply(transaction);
		}
	}

	async #drain(): Promise<void> {
		const generation = this.#generation;
		for (;;) {
			const batch = this.queue.takeNext();
			if (!batch) {
				return;
			}
			try {
				const result = await this.transport.send(batch);
				if (generation !== this.#generation) {
					this.queue.requeue(batch);
					return;
				}
				const { rejected } = this.queue.acknowledge(
					batch,
					result.results,
					this.store.lastSyncId,
				);
				if (rejected.length > 0) {
					runInAction(() => {
						for (const { transaction } of rejected.reverse()) {
							this.store.revert(transaction);
						}
						this.rebase();
						this.lastError = rejected.map((each) => each.error).join("; ");
					});
				}
				this.#retryDelay = this.#retryDelayMs;
			} catch (error) {
				this.queue.requeue(batch);
				if (generation !== this.#generation) {
					return;
				}
				this.#setStatus("offline", describe(error));
				this.#scheduleRetry();
				return;
			}
		}
	}

	#scheduleRetry(): void {
		this.#clearRetry();
		const delay = this.#retryDelay;
		this.#retryDelay = Math.min(this.#retryDelay * 2, this.#maxRetryDelayMs);
		this.#retryTimer = setTimeout(() => {
			this.#retryTimer = null;
			this.#setStatus("ready");
			void this.catchUp()
				.catch(() => {})
				.then(() => this.flush());
		}, delay);
	}

	#clearRetry(): void {
		if (this.#retryTimer) {
			clearTimeout(this.#retryTimer);
			this.#retryTimer = null;
		}
	}

	#setStatus(status: SyncStatus, error: string | null = null): void {
		runInAction(() => {
			this.status = status;
			this.lastError = error;
		});
	}
}

function describe(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
