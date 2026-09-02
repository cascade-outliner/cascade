import type { ModelName, NodeData, NodePatch } from "../types.ts";
import type { Transaction } from "./transaction.ts";

interface SyncActionBase {
	id: number;
	model: ModelName;
	modelId: string;
}

export interface InsertAction extends SyncActionBase {
	action: "I";
	data: NodeData;
}

export interface UpdateAction extends SyncActionBase {
	action: "U";
	data: NodePatch;
}

export interface DeleteAction extends SyncActionBase {
	action: "D";
}

export type SyncAction = InsertAction | UpdateAction | DeleteAction;

export interface BootstrapResult {
	lastSyncId: number;
	nodes: NodeData[];
}

export interface DeltaPacket {
	actions: SyncAction[];
}

export interface TransactionBatch {
	id: string;
	transactions: Transaction[];
}

export type TransactionResult =
	| { transactionId: string; syncId: number }
	| { transactionId: string; error: string };

export interface SendResult {
	results: TransactionResult[];
}

export type DeltaListener = (packet: DeltaPacket) => void;

export interface SyncTransport {
	bootstrap(): Promise<BootstrapResult>;
	delta(sinceSyncId: number): Promise<DeltaPacket>;
	send(batch: TransactionBatch): Promise<SendResult>;
	subscribe(listener: DeltaListener): () => void;
}
