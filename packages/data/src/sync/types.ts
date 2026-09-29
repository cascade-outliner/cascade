import type { Node } from "../outline/types.ts";

/** A node removed at `deletedAt` (ms since the epoch); the tombstone's clock for conflict resolution. */
export interface Tombstone {
	id: string;
	deletedAt: number;
}

/** When onboarding finished, and whether the server has it yet. */
export interface OnboardingRecord {
	completedAt: number;
	synced: boolean;
}

export interface PushRequest {
	put: Node[];
	delete: Tombstone[];
	onboarding?: Pick<OnboardingRecord, "completedAt">;
}

export interface PullRequest {
	/** Cursor returned by the previous pull, or `null` for everything. */
	since: string | null;
}

export interface PullResponse {
	put: Node[];
	delete: Tombstone[];
	cursor: string | null;
	/** On a full pull (`since: null`): whether the server has this workspace at all. */
	known?: boolean;
	/** On a full pull: when the server says onboarding finished (ms since the epoch), if it did. */
	onboardedAt?: number | null;
}

/** Talks to the server. Implemented by the app, so the engine stays framework-free. */
export interface SyncTransport {
	push(request: PushRequest): Promise<void>;
	pull(request: PullRequest): Promise<PullResponse>;
}

export interface SyncMeta {
	/** The signed-in user the local outline belongs to, or `null` before the first sign-in. */
	userId: string | null;
	cursor: string | null;
	onboarding: OnboardingRecord | null;
}

/** One pending local change per node id: the latest put, or a tombstone. */
export type OutboxEntry =
	| { id: string; kind: "put"; node: Node }
	| { id: string; kind: "delete"; deletedAt: number };

/** Durable sync bookkeeping: identity, pull cursor, and the outbox of unpushed changes. */
export interface SyncState {
	getMeta(): Promise<SyncMeta>;
	setMeta(meta: Partial<SyncMeta>): Promise<void>;
	/** Queues `entries`, replacing any pending entry with the same id. */
	enqueue(entries: OutboxEntry[]): Promise<void>;
	peek(): Promise<OutboxEntry[]>;
	/** Removes `entries` from the outbox, unless a newer entry replaced one meanwhile. */
	ack(entries: OutboxEntry[]): Promise<void>;
}

export type SyncStatus = "disabled" | "idle" | "syncing" | "error";
