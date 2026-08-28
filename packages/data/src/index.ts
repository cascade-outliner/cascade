export { emptyState } from "./empty-content.ts";
export { OutlineStore } from "./outline-store.ts";
export {
	coalescedPersistence,
	createOutlinePersistence,
	IndexedDbPersistence,
	type IndexedDbPersistenceOptions,
	indexedDbPersistence,
	isIndexedDbAvailable,
	memoryPersistence,
	type OutlinePersistenceOptions,
} from "./persistence/index.ts";
export type { Node, OutlinePersistence, OutlineSnapshot } from "./types.ts";
