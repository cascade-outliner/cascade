import type { LexicalElementNode } from "@cascade/outliner/lexical/read/lexical-read-view";
import { LexicalReadView } from "@cascade/outliner/lexical/read/lexical-read-view";
import { m } from "#/paraglide/messages.js";
import type {
	TreeHistoryDetail,
	TreeHistoryEventKind,
	TreeHistoryPayload,
	TreeHistorySnapshot,
} from "@/features/tree-history/model/tree-history.schema";

export function actionLabel(kind: TreeHistoryEventKind): string {
	switch (kind) {
		case "node_created":
			return m.tree_history_action_created();
		case "subtree_duplicated":
			return m.tree_history_action_duplicated();
		case "content_changed":
			return m.tree_history_action_content();
		case "node_moved":
			return m.tree_history_action_moved();
		case "subtree_deleted":
			return m.tree_history_action_deleted();
		case "subtree_restored":
			return m.tree_history_action_restored();
		case "type_changed":
			return m.tree_history_action_type();
		case "due_date_changed":
			return m.tree_history_action_due_date();
		case "recurrence_changed":
			return m.tree_history_action_recurrence();
		case "recurring_task_completed":
			return m.tree_history_action_recurring_completed();
		case "tags_changed":
			return m.tree_history_action_tags();
		case "tag_created":
			return m.tree_history_action_tag_created();
		case "tag_renamed":
			return m.tree_history_action_tag_renamed();
		case "tag_deleted":
			return m.tree_history_action_tag_deleted();
		case "tag_restored":
			return m.tree_history_action_tag_restored();
	}
}

function ContentPreview({ content }: { content: unknown }) {
	return (
		<div className="min-h-16 rounded-md border border-ink/10 bg-white p-3 text-sm dark:border-surface/15 dark:bg-ink">
			<LexicalReadView
				content={content as { root: LexicalElementNode } | null}
			/>
		</div>
	);
}

function BeforeAfter({
	before,
	after,
	render = (value) => String(value ?? "—"),
}: {
	before: unknown;
	after: unknown;
	render?: (value: unknown) => React.ReactNode;
}) {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<div>
				<div className="mb-1 font-semibold text-xs uppercase tracking-wide">
					{m.tree_history_before()}
				</div>
				{render(before)}
			</div>
			<div>
				<div className="mb-1 font-semibold text-xs uppercase tracking-wide">
					{m.tree_history_after()}
				</div>
				{render(after)}
			</div>
		</div>
	);
}

function SubtreePreview({ snapshots }: { snapshots: TreeHistorySnapshot[] }) {
	if (snapshots.length === 0) return null;
	return (
		<div className="max-h-80 overflow-auto rounded-md border border-ink/10 p-2 dark:border-surface/15">
			{snapshots.map((snapshot) => (
				<div
					key={snapshot.nodeId}
					className="py-1"
					style={{ paddingLeft: `${snapshot.depth * 20}px` }}
				>
					<LexicalReadView
						content={snapshot.content as { root: LexicalElementNode } | null}
					/>
				</div>
			))}
		</div>
	);
}

export function EventPreview({ detail }: { detail: TreeHistoryDetail }) {
	const payload: TreeHistoryPayload = detail.payload;
	switch (payload.kind) {
		case "content_changed":
			return (
				<BeforeAfter
					before={payload.before}
					after={payload.after}
					render={(value) => <ContentPreview content={value} />}
				/>
			);
		case "type_changed":
			return (
				<BeforeAfter before={payload.before.type} after={payload.after.type} />
			);
		case "due_date_changed":
			return <BeforeAfter before={payload.before} after={payload.after} />;
		case "recurrence_changed":
			return (
				<BeforeAfter
					before={JSON.stringify(payload.before.recurrence)}
					after={JSON.stringify(payload.after.recurrence)}
				/>
			);
		case "recurring_task_completed":
			return (
				<BeforeAfter
					before={payload.before.dueDate}
					after={payload.after.dueDate}
				/>
			);
		case "tags_changed":
			return (
				<BeforeAfter
					before={payload.before}
					after={payload.after}
					render={(value) => (
						<p className="text-sm">
							{(value as string[]).join(", ") || m.tree_history_none()}
						</p>
					)}
				/>
			);
		case "tag_renamed":
			return (
				<div>
					<BeforeAfter before={payload.before} after={payload.after} />
					<p className="mt-2 text-sm text-ink/60 dark:text-surface/60">
						{m.tree_history_nodes_affected({ count: payload.nodeIds.length })}
					</p>
				</div>
			);
		case "tag_created":
			return <p className="text-sm">{payload.name}</p>;
		case "node_moved":
			return (
				<BeforeAfter
					before={payload.before.parentId ?? m.tree_history_root()}
					after={payload.after.parentId ?? m.tree_history_root()}
				/>
			);
		case "tag_deleted":
		case "tag_restored":
			return (
				<p className="text-sm">
					{payload.name} ·{" "}
					{m.tree_history_nodes_affected({ count: payload.nodeIds.length })}
				</p>
			);
		case "subtree_deleted":
		case "node_created":
		case "subtree_duplicated":
		case "subtree_restored":
			return <SubtreePreview snapshots={detail.snapshots} />;
	}
}
