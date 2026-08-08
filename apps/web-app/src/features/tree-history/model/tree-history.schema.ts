import {
	type RecurrenceRule,
	recurrenceRuleSchema,
} from "@cascade/outliner/recurrence";
import { z } from "zod";

export const treeHistoryEventKindSchema = z.enum([
	"node_created",
	"subtree_duplicated",
	"content_changed",
	"node_moved",
	"subtree_deleted",
	"subtree_restored",
	"type_changed",
	"due_date_changed",
	"icon_changed",
	"color_changed",
	"priority_changed",
	"status_changed",
	"recurrence_changed",
	"recurring_task_completed",
	"tags_changed",
	"tag_created",
	"tag_renamed",
	"tag_deleted",
	"tag_restored",
]);

export type TreeHistoryEventKind = z.infer<typeof treeHistoryEventKindSchema>;

export const historyRestoreTargetSchema = z.discriminatedUnion("position", [
	z.object({ position: z.literal("before"), targetId: z.string() }),
	z.object({ position: z.literal("after"), targetId: z.string() }),
	z.object({ position: z.literal("append") }),
]);

export type HistoryRestoreTarget = z.infer<typeof historyRestoreTargetSchema>;

const historyLocationContextSchema = z.object({
	breadcrumb: z.array(z.string()),
	previousSibling: z.string().nullable(),
	nextSibling: z.string().nullable(),
});

export const historyLocationSchema = z.object({
	parentId: z.string().nullable(),
	target: historyRestoreTargetSchema,
	context: historyLocationContextSchema.optional(),
});

export type HistoryLocation = z.infer<typeof historyLocationSchema>;

const basePayloadSchema = z.object({ label: z.string() });

export const treeHistoryPayloadSchema = z.discriminatedUnion("kind", [
	basePayloadSchema.extend({
		kind: z.literal("node_created"),
	}),
	basePayloadSchema.extend({
		kind: z.literal("subtree_duplicated"),
		sourceNodeId: z.string(),
		count: z.number().int().nonnegative(),
	}),
	basePayloadSchema.extend({
		kind: z.literal("content_changed"),
		before: z.unknown().nullable(),
		after: z.unknown().nullable(),
	}),
	basePayloadSchema.extend({
		kind: z.literal("node_moved"),
		before: historyLocationSchema,
		after: historyLocationSchema,
	}),
	basePayloadSchema.extend({
		kind: z.literal("subtree_deleted"),
		location: historyLocationSchema,
		count: z.number().int().positive(),
	}),
	basePayloadSchema.extend({
		kind: z.literal("subtree_restored"),
		count: z.number().int().positive(),
	}),
	basePayloadSchema.extend({
		kind: z.literal("type_changed"),
		before: z.object({
			type: z.string(),
			metadata: z.unknown().nullable(),
			recurrence: recurrenceRuleSchema.nullable().optional(),
		}),
		after: z.object({
			type: z.string(),
			metadata: z.unknown().nullable(),
			recurrence: recurrenceRuleSchema.nullable().optional(),
		}),
	}),
	basePayloadSchema.extend({
		kind: z.literal("due_date_changed"),
		before: z.string().nullable(),
		after: z.string().nullable(),
		beforeTime: z.string().nullable().optional(),
		afterTime: z.string().nullable().optional(),
		beforeRecurrence: recurrenceRuleSchema.nullable().optional(),
		afterRecurrence: recurrenceRuleSchema.nullable().optional(),
	}),
	basePayloadSchema.extend({
		kind: z.literal("icon_changed"),
		before: z.string().nullable(),
		after: z.string().nullable(),
	}),
	basePayloadSchema.extend({
		kind: z.literal("color_changed"),
		before: z.string().nullable(),
		after: z.string().nullable(),
	}),
	basePayloadSchema.extend({
		kind: z.literal("priority_changed"),
		before: z.string().nullable(),
		after: z.string().nullable(),
	}),
	basePayloadSchema.extend({
		kind: z.literal("status_changed"),
		before: z.string().nullable(),
		after: z.string().nullable(),
	}),
	basePayloadSchema.extend({
		kind: z.literal("recurrence_changed"),
		before: z.object({
			recurrence: z.unknown().nullable(),
			metadata: z.unknown().nullable(),
		}),
		after: z.object({
			recurrence: z.unknown().nullable(),
			metadata: z.unknown().nullable(),
		}),
	}),
	basePayloadSchema.extend({
		kind: z.literal("recurring_task_completed"),
		before: z.object({
			dueDate: z.string().nullable(),
			metadata: z.unknown().nullable(),
		}),
		after: z.object({
			dueDate: z.string().nullable(),
			metadata: z.unknown().nullable(),
		}),
	}),
	basePayloadSchema.extend({
		kind: z.literal("tags_changed"),
		before: z.array(z.string()),
		after: z.array(z.string()),
	}),
	basePayloadSchema.extend({
		kind: z.literal("tag_created"),
		name: z.string(),
	}),
	basePayloadSchema.extend({
		kind: z.literal("tag_renamed"),
		before: z.string(),
		after: z.string(),
		nodeIds: z.array(z.string()),
	}),
	basePayloadSchema.extend({
		kind: z.literal("tag_deleted"),
		name: z.string(),
		nodeIds: z.array(z.string()),
	}),
	basePayloadSchema.extend({
		kind: z.literal("tag_restored"),
		name: z.string(),
		nodeIds: z.array(z.string()),
	}),
]);

export type TreeHistoryPayload = z.infer<typeof treeHistoryPayloadSchema>;

export interface TreeHistoryCursor {
	createdAt: string;
	id: string;
}

export interface TreeHistorySummary {
	id: string;
	kind: TreeHistoryEventKind;
	nodeId: string | null;
	label: string;
	createdAt: string;
	restoredFromEventId: string | null;
	restorable: boolean;
	nodeDeleted: boolean;
}

export interface TreeHistorySnapshot {
	nodeId: string;
	parentId: string | null;
	content: unknown;
	type: string;
	metadata: unknown;
	expanded: boolean;
	order: string;
	dueDate: string | null;
	dueTime: string | null;
	recurrence: RecurrenceRule | null;
	icon: string | null;
	tags: string[];
	depth: number;
	isRoot: boolean;
	phase: "before" | "after";
}

export interface TreeHistoryDetail extends TreeHistorySummary {
	payload: TreeHistoryPayload;
	snapshots: TreeHistorySnapshot[];
}

export interface TreeHistoryRestoreResult {
	eventId: string;
	affectedNodeIds: string[];
}

export const RESTORABLE_HISTORY_KINDS = new Set<TreeHistoryEventKind>([
	"content_changed",
	"node_moved",
	"subtree_deleted",
	"type_changed",
	"due_date_changed",
	"icon_changed",
	"color_changed",
	"priority_changed",
	// `status_changed` is deliberately absent: the status a node was in may
	// have been deleted since, and restoring would resurrect a dangling
	// reference the `set null` FK exists to prevent.
	"recurrence_changed",
	"recurring_task_completed",
	"tags_changed",
	"tag_deleted",
]);
