import type { LexicalElementNode } from "@cascade/outliner/lexical/read/lexical-read-view";
import { LexicalReadView } from "@cascade/outliner/lexical/read/lexical-read-view";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import type {
	HistoryLocation,
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
		case "icon_changed":
			return m.tree_history_action_icon();
		case "color_changed":
			return m.tree_history_action_color();
		case "priority_changed":
			return m.tree_history_action_priority();
		case "status_changed":
			return m.tree_history_action_status();
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

function BeforeAfter<T>({
	before,
	after,
	render = (value) => String(value ?? "—"),
}: {
	before: T;
	after: T;
	render?: (value: T) => React.ReactNode;
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

function MoveLocationPreview({
	location,
	movedLabel,
	title,
}: {
	location: HistoryLocation;
	movedLabel: string;
	title: string;
}) {
	if (!location.context) {
		return (
			<div className="rounded-lg border border-ink/10 p-4 dark:border-surface/15">
				<h3 className="mb-3 font-semibold text-sm">{title}</h3>
				<p className="text-ink/60 text-sm dark:text-surface/60">
					{m.tree_history_location_unavailable()}
				</p>
			</div>
		);
	}

	const nodeLabel = (label: string) => label || m.breadcrumbs_untitled();
	const breadcrumb = [
		m.tree_history_root(),
		...location.context.breadcrumb.map(nodeLabel),
	].join(" / ");
	return (
		<div className="overflow-hidden rounded-lg border border-ink/10 dark:border-surface/15">
			<div className="border-ink/10 border-b bg-ink/5 px-4 py-3 dark:border-surface/15 dark:bg-surface/5">
				<h3 className="font-semibold text-sm">{title}</h3>
				<p className="mt-2 font-semibold text-ink/45 text-xs uppercase tracking-wide dark:text-surface/45">
					{m.tree_history_parent_path()}
				</p>
				<p className="mt-0.5 break-words text-sm">{breadcrumb}</p>
			</div>
			<dl className="grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-1 p-3 text-sm">
				<dt className="text-ink/45 text-xs dark:text-surface/45">
					{m.tree_history_previous_sibling()}
				</dt>
				<dd className="truncate text-ink/65 dark:text-surface/65">
					{location.context.previousSibling === null ? (
						<span className="italic">{m.tree_history_start()}</span>
					) : (
						nodeLabel(location.context.previousSibling)
					)}
				</dd>
				<dt className="font-semibold text-danger text-xs">
					{m.tree_history_moved_node()}
				</dt>
				<dd className="truncate rounded-md bg-danger/10 px-2 py-1 font-semibold">
					{nodeLabel(movedLabel)}
				</dd>
				<dt className="text-ink/45 text-xs dark:text-surface/45">
					{m.tree_history_next_sibling()}
				</dt>
				<dd className="truncate text-ink/65 dark:text-surface/65">
					{location.context.nextSibling === null ? (
						<span className="italic">{m.tree_history_end()}</span>
					) : (
						nodeLabel(location.context.nextSibling)
					)}
				</dd>
			</dl>
		</div>
	);
}

function MovePreview({
	before,
	after,
	movedLabel,
}: {
	before: HistoryLocation;
	after: HistoryLocation;
	movedLabel: string;
}) {
	return (
		<div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
			<MoveLocationPreview
				location={before}
				movedLabel={movedLabel}
				title={m.tree_history_from()}
			/>
			<div className="flex justify-center text-danger" aria-hidden>
				<ArrowRightIcon
					size={22}
					weight="bold"
					className="rotate-90 sm:rotate-0"
				/>
			</div>
			<MoveLocationPreview
				location={after}
				movedLabel={movedLabel}
				title={m.tree_history_to()}
			/>
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
		case "icon_changed":
			return (
				<BeforeAfter
					before={payload.before}
					after={payload.after}
					render={(value) => (
						<p className="text-2xl">{value ?? m.tree_history_none()}</p>
					)}
				/>
			);
		case "priority_changed":
		case "status_changed":
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
				<MovePreview
					before={payload.before}
					after={payload.after}
					movedLabel={payload.label}
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
