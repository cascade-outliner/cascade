import type { ModelName, NodeData, NodePatch } from "../types.ts";

interface TransactionBase {
	id: string;
	model: ModelName;
	modelId: string;
	createdAt: number;
	batchId?: string;
}

export interface CreateTransaction extends TransactionBase {
	kind: "create";
	data: NodeData;
}

export interface UpdateTransaction extends TransactionBase {
	kind: "update";
	changes: NodePatch;
	previous: NodePatch;
}

export interface DeleteTransaction extends TransactionBase {
	kind: "delete";
	previous: NodeData;
}

export type Transaction =
	| CreateTransaction
	| UpdateTransaction
	| DeleteTransaction;

export interface TransactionSink {
	push(transaction: Transaction): void;
}

export const NOOP_SINK: TransactionSink = { push() {} };

function base(modelId: string): TransactionBase {
	return {
		id: crypto.randomUUID(),
		model: "node",
		modelId,
		createdAt: Date.now(),
	};
}

export function createTransaction(data: NodeData): CreateTransaction {
	return { ...base(data.id), kind: "create", data };
}

export function updateTransaction(
	modelId: string,
	changes: NodePatch,
	previous: NodePatch,
): UpdateTransaction {
	return { ...base(modelId), kind: "update", changes, previous };
}

export function deleteTransaction(previous: NodeData): DeleteTransaction {
	return { ...base(previous.id), kind: "delete", previous };
}
