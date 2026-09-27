export { emptyState, plainText, textState } from "./outline/content.ts";
export type { SearchHit, SearchResult } from "./outline/search.ts";
export { OutlineStore } from "./outline/store.ts";
export type { Node, Row } from "./outline/types.ts";
export { IdbPersistence, openCascadeDb } from "./persistence/idb.ts";
export { MemoryPersistence } from "./persistence/memory.ts";
export type { OutlineChange, OutlinePersistence } from "./persistence/types.ts";
export { SyncEngine, type SyncEngineOptions } from "./sync/engine.ts";
export { IdbSyncState } from "./sync/state-idb.ts";
export { MemorySyncState } from "./sync/state-memory.ts";
export { SyncedPersistence } from "./sync/synced-persistence.ts";
export type {
	OnboardingRecord,
	OutboxEntry,
	PullRequest,
	PullResponse,
	PushRequest,
	SyncMeta,
	SyncState,
	SyncStatus,
	SyncTransport,
	Tombstone,
} from "./sync/types.ts";
export { getOrCreateWorkspaceId, isWorkspaceId } from "./sync/workspace.ts";
export type { Match, TextRange } from "./util/match.ts";
