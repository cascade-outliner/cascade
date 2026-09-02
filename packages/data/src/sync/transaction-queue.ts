import { action, computed, makeObservable, observable } from "mobx";
import type { TransactionBatch, TransactionResult } from "./protocol.ts";
import type { Transaction, TransactionSink } from "./transaction.ts";

interface AwaitingEntry {
	transaction: Transaction;
	syncId: number;
}

export class TransactionQueue implements TransactionSink {
	readonly created: Transaction[] = [];
	readonly queued: TransactionBatch[] = [];
	executing: TransactionBatch | null = null;
	readonly awaitingSync = new Map<string, AwaitingEntry>();
	readonly completed: Transaction[] = [];
	readonly failed: Transaction[] = [];

	#commitScheduled = false;
	#onBatchReady: (() => void) | null = null;

	constructor() {
		makeObservable(this, {
			created: observable.shallow,
			queued: observable.shallow,
			executing: observable.ref,
			awaitingSync: observable.shallow,
			completed: observable.shallow,
			failed: observable.shallow,
			pendingCount: computed,
			push: action,
			commit: action,
			takeNext: action,
			acknowledge: action,
			requeue: action,
			markSynced: action,
		});
	}

	get pendingCount(): number {
		const queued = this.queued.reduce(
			(total, batch) => total + batch.transactions.length,
			0,
		);
		return (
			this.created.length +
			queued +
			(this.executing?.transactions.length ?? 0) +
			this.awaitingSync.size
		);
	}

	onBatchReady(listener: (() => void) | null): void {
		this.#onBatchReady = listener;
	}

	push(transaction: Transaction): void {
		this.created.push(transaction);
		if (!this.#commitScheduled) {
			this.#commitScheduled = true;
			queueMicrotask(() => this.commit());
		}
	}

	commit(): TransactionBatch | null {
		this.#commitScheduled = false;
		if (this.created.length === 0) {
			return null;
		}
		const batchId = crypto.randomUUID();
		const transactions = this.created
			.splice(0)
			.map((transaction) => ({ ...transaction, batchId }));
		const batch: TransactionBatch = { id: batchId, transactions };
		this.queued.push(batch);
		this.#onBatchReady?.();
		return batch;
	}

	takeNext(): TransactionBatch | null {
		if (this.executing) {
			return null;
		}
		const batch = this.queued.shift() ?? null;
		this.executing = batch;
		return batch;
	}

	acknowledge(
		batch: TransactionBatch,
		results: TransactionResult[],
		syncedUpTo: number,
	): { rejected: Array<{ transaction: Transaction; error: string }> } {
		const byId = new Map(batch.transactions.map((each) => [each.id, each]));
		const rejected: Array<{ transaction: Transaction; error: string }> = [];

		for (const result of results) {
			const transaction = byId.get(result.transactionId);
			if (!transaction) {
				continue;
			}
			byId.delete(result.transactionId);
			if ("error" in result) {
				this.failed.push(transaction);
				rejected.push({ transaction, error: result.error });
			} else if (result.syncId <= syncedUpTo) {
				this.completed.push(transaction);
			} else {
				this.awaitingSync.set(transaction.id, {
					transaction,
					syncId: result.syncId,
				});
			}
		}

		for (const transaction of byId.values()) {
			this.failed.push(transaction);
			rejected.push({ transaction, error: "unacknowledged" });
		}

		if (this.executing?.id === batch.id) {
			this.executing = null;
		}
		return { rejected };
	}

	requeue(batch: TransactionBatch): void {
		if (this.executing?.id === batch.id) {
			this.executing = null;
		}
		this.queued.unshift(batch);
	}

	markSynced(upToSyncId: number): Transaction[] {
		const done: Transaction[] = [];
		for (const [id, entry] of this.awaitingSync) {
			if (entry.syncId <= upToSyncId) {
				this.awaitingSync.delete(id);
				this.completed.push(entry.transaction);
				done.push(entry.transaction);
			}
		}
		return done;
	}

	inFlight(): Transaction[] {
		return [
			...[...this.awaitingSync.values()].map((entry) => entry.transaction),
			...(this.executing?.transactions ?? []),
			...this.queued.flatMap((batch) => batch.transactions),
			...this.created,
		];
	}
}
