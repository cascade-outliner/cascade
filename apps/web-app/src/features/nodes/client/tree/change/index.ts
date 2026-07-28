/**
 * Internal visible-tree change module (issue #542, slice 1 of
 * `docs/research/536-visible-tree-change-orchestration.md`). `VisibleTree`
 * stays the only external interface; nothing here is wired into a
 * production hook yet — see the incremental migration plan in that doc.
 */

export type {
	ChangeModulePorts,
	VisibleTreeChangeModule,
} from "./change-module";
export { createVisibleTreeChangeModule } from "./change-module";
export { ChangeJournal } from "./journal";
export type {
	CreatedNode,
	HistoryEntry,
	PendingChange,
	TreeHistory,
	TreeMotion,
	TreeRemote,
	TreeViewStore,
} from "./ports";
export { SerialQueue, SerialQueueRegistry } from "./serial-queue";
export type {
	ChangeContext,
	ChangeError,
	ChangeErrorKind,
	ChangeId,
	ChangeOutcome,
	CreatePlacement,
	DeletionReceipt,
	HistoryMode,
	InvalidationEffects,
	InvertedCommands,
	TreeCommand,
	TreeCommandKind,
} from "./types";
