import type {
	BootstrapResult,
	DeltaListener,
	DeltaPacket,
	SendResult,
	SyncAction,
	SyncTransport,
	TransactionBatch,
	TransactionResult,
} from "./protocol.ts";
import type { Transaction } from "./transaction.ts";

const TAG = "[cascade/sync]";

// TODO: replace with the HTTP + WebSocket transport once the server exists.
export class ConsoleSyncTransport implements SyncTransport {
	#syncId = 0;
	readonly #listeners = new Set<DeltaListener>();
	readonly #echo: boolean;

	constructor(options: { echo?: boolean; initialSyncId?: number } = {}) {
		this.#echo = options.echo ?? true;
		this.#syncId = options.initialSyncId ?? 0;
	}

	async bootstrap(): Promise<BootstrapResult> {
		console.log(TAG, "→ bootstrap");
		const result: BootstrapResult = { lastSyncId: this.#syncId, nodes: [] };
		console.log(TAG, "← bootstrap", result);
		return result;
	}

	async delta(sinceSyncId: number): Promise<DeltaPacket> {
		console.log(TAG, "→ delta", { sinceSyncId });
		const packet: DeltaPacket = { actions: [] };
		console.log(TAG, "← delta", packet);
		return packet;
	}

	async send(batch: TransactionBatch): Promise<SendResult> {
		console.log(TAG, "→ send", batch);
		const results: TransactionResult[] = batch.transactions.map(
			(transaction) => ({
				transactionId: transaction.id,
				syncId: ++this.#syncId,
			}),
		);
		const result: SendResult = { results };
		console.log(TAG, "← send", result);
		if (this.#echo) {
			queueMicrotask(() => this.#broadcast(echoActions(batch, results)));
		}
		return result;
	}

	subscribe(listener: DeltaListener): () => void {
		console.log(TAG, "subscribe");
		this.#listeners.add(listener);
		return () => {
			console.log(TAG, "unsubscribe");
			this.#listeners.delete(listener);
		};
	}

	#broadcast(actions: SyncAction[]): void {
		if (actions.length === 0) {
			return;
		}
		const packet: DeltaPacket = { actions };
		console.log(TAG, "← delta packet", packet);
		for (const listener of this.#listeners) {
			listener(packet);
		}
	}
}

function echoActions(
	batch: TransactionBatch,
	results: TransactionResult[],
): SyncAction[] {
	const byId = new Map<string, Transaction>(
		batch.transactions.map((each) => [each.id, each]),
	);
	const actions: SyncAction[] = [];
	for (const result of results) {
		const transaction = byId.get(result.transactionId);
		if (!transaction || "error" in result) {
			continue;
		}
		const head = {
			id: result.syncId,
			model: transaction.model,
			modelId: transaction.modelId,
		};
		switch (transaction.kind) {
			case "create":
				actions.push({ ...head, action: "I", data: transaction.data });
				break;
			case "update":
				actions.push({ ...head, action: "U", data: transaction.changes });
				break;
			case "delete":
				actions.push({ ...head, action: "D" });
				break;
		}
	}
	return actions;
}
