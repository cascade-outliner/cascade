export { emptyState, plainText, textState } from "./outline/content.ts";
export type { SearchHit, SearchResult } from "./outline/search.ts";
export { OutlineStore } from "./outline/store.ts";
export type { Node, Row } from "./outline/types.ts";
export { IdbPersistence } from "./persistence/idb.ts";
export { MemoryPersistence } from "./persistence/memory.ts";
export type { OutlineChange, OutlinePersistence } from "./persistence/types.ts";
export type { Match, TextRange } from "./util/match.ts";
