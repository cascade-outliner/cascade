import { parseCalendarDate } from "@cascade/outliner/calendar-date";
import { dueBucket } from "@cascade/outliner/due-date-bucket";
import { NodeTagPills } from "@cascade/outliner/features/tags/node-tags-pills";
import { NodeCheckbox } from "@cascade/outliner/features/task/node-checkbox";
import { useOutlinerLabels } from "@cascade/outliner/labels-context";
import { LexicalReadView } from "@cascade/outliner/lexical/read/lexical-read-view";
import { toLexicalContent } from "@cascade/outliner/lexical-content";
import { DefaultNodeLink } from "@cascade/outliner/node-link-slot";
import { NodeToggle } from "@cascade/outliner/node-toggle";
import type {
	NodeMetadataOf,
	VisibleNodeRow,
} from "@cascade/outliner/node-types";
import { cva } from "@cascade/ui/cva.config";
import {
	ArrowsClockwiseIcon,
	CalendarDotIcon,
	CalendarDotsIcon,
	CalendarIcon,
	DotsSixVerticalIcon,
} from "@phosphor-icons/react/ssr";
import { useMemo, useState } from "react";

interface SharedTreeViewProps {
	rootId: string;
	rows: VisibleNodeRow[];
	indentSize?: number;
}

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
});
const shortDateWithYearFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
	year: "numeric",
});

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDuePill(
	dueDate: Date,
	labels: { dueToday: string; dueTomorrow: string; dueYesterday: string },
): string {
	const diffDays = Math.round(
		(startOfDay(dueDate).getTime() - startOfDay(new Date()).getTime()) /
			86_400_000,
	);
	if (diffDays === 0) return labels.dueToday;
	if (diffDays === 1) return labels.dueTomorrow;
	if (diffDays === -1) return labels.dueYesterday;
	const formatter =
		dueDate.getFullYear() === new Date().getFullYear()
			? shortDateFormatter
			: shortDateWithYearFormatter;
	return formatter.format(dueDate);
}

function pillIcon(dueDate: Date) {
	const diffDays = Math.round(
		(startOfDay(dueDate).getTime() - startOfDay(new Date()).getTime()) /
			86_400_000,
	);
	if (diffDays === 0) return <CalendarDotIcon size={11} weight="bold" />;
	if (diffDays === 1) return <CalendarDotsIcon size={11} weight="bold" />;
	return <CalendarIcon size={11} weight="bold" />;
}

// Mirrors node-due-date-pill.tsx's `pill` cva exactly, so a shared tree's
// due-date pills look identical to the owner's — just rendered as an inert
// span instead of a Popover trigger, since there's nothing to change here.
const pill = cva({
	base: [
		"inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums whitespace-nowrap",
	],
	variants: {
		bucket: {
			overdue:
				"border-danger/30 bg-danger/10 text-danger dark:border-danger/35 dark:bg-danger/15",
			today:
				"border-accent/50 bg-accent/25 text-ink dark:border-accent/40 dark:bg-accent/20 dark:text-surface",
			upcoming:
				"border-ink/15 bg-transparent text-muted dark:border-surface/15 dark:text-surface/60",
			completed:
				"border-ink/10 bg-transparent text-muted opacity-70 dark:border-surface/10 dark:text-canvas/30",
		},
	},
});

function StaticDueDatePill({
	dueDate,
	completed,
	hasRecurrence,
}: {
	dueDate: Date;
	completed: boolean;
	hasRecurrence: boolean;
}) {
	const labels = useOutlinerLabels();
	const bucket = dueBucket(dueDate, completed);
	return (
		<span className={pill({ bucket })}>
			<span className="shrink-0">{pillIcon(dueDate)}</span>
			<span className="truncate">{formatDuePill(dueDate, labels)}</span>
			{hasRecurrence && <ArrowsClockwiseIcon size={11} weight="bold" />}
		</span>
	);
}

/**
 * Read-only rendering of a shared subtree styled to match the real,
 * editable tree row-for-row (same toggle, checkbox, link dot, due-date
 * pill, and tag pills), but with every interactive affordance either
 * omitted or wired to a no-op — there's no editor, drag-and-drop, or
 * context menu here, so there's no UI path to mutate the owner's tree
 * regardless of what the API would allow.
 */
export function SharedTreeView({
	rootId,
	rows,
	indentSize = 16,
}: SharedTreeViewProps) {
	const childrenByParent = useMemo(() => {
		const map = new Map<string | null, VisibleNodeRow[]>();
		for (const row of rows) {
			const siblings = map.get(row.parentId) ?? [];
			siblings.push(row);
			map.set(row.parentId, siblings);
		}
		return map;
	}, [rows]);

	const [collapsed, setCollapsed] = useState<Set<string>>(
		() => new Set(rows.filter((row) => !row.expanded).map((row) => row.id)),
	);
	const labels = useOutlinerLabels();

	const root = rows.find((row) => row.id === rootId);
	if (!root) return null;

	return (
		<div role="tree" aria-label={labels.treeLabel}>
			<SharedTreeNode
				row={root}
				depth={0}
				indentSize={indentSize}
				childrenByParent={childrenByParent}
				collapsed={collapsed}
				onToggleCollapse={(id) =>
					setCollapsed((current) => {
						const next = new Set(current);
						if (next.has(id)) next.delete(id);
						else next.add(id);
						return next;
					})
				}
			/>
		</div>
	);
}

function SharedTreeNode({
	row,
	depth,
	indentSize,
	childrenByParent,
	collapsed,
	onToggleCollapse,
}: {
	row: VisibleNodeRow;
	depth: number;
	indentSize: number;
	childrenByParent: Map<string | null, VisibleNodeRow[]>;
	collapsed: Set<string>;
	onToggleCollapse: (id: string) => void;
}) {
	const children = childrenByParent.get(row.id) ?? [];
	const expanded = !collapsed.has(row.id);
	const completed =
		row.type === "task" &&
		((row.metadata as NodeMetadataOf<"task"> | null)?.completed ?? false);
	const dueDate = row.dueDate ? parseCalendarDate(row.dueDate) : null;

	return (
		<>
			<div
				role="treeitem"
				tabIndex={-1}
				aria-level={row.depth + 1}
				aria-expanded={row.hasChildren ? expanded : undefined}
				className="group/node relative flex items-center gap-2 rounded-md py-1"
			>
				<div style={{ paddingLeft: depth * indentSize }} />
				<button
					type="button"
					disabled
					tabIndex={-1}
					aria-hidden="true"
					className="shrink-0 touch-none text-ink opacity-0 group-hover/node:opacity-100 dark:text-surface"
				>
					<DotsSixVerticalIcon size={16} />
				</button>
				<NodeToggle
					hasChildren={children.length > 0}
					expanded={expanded}
					onToggle={() => onToggleCollapse(row.id)}
				/>
				<DefaultNodeLink />
				{row.type === "task" && (
					<NodeCheckbox metadata={row.metadata} onToggle={() => {}} />
				)}
				<div
					className={`min-w-0 flex-1 text-left rr-block ${completed ? "line-through text-muted dark:text-canvas/30" : ""}`}
				>
					<LexicalReadView content={toLexicalContent(row.content)} />
				</div>
				<div className="flex gap-1 pr-1">
					{dueDate && (
						<StaticDueDatePill
							dueDate={dueDate}
							completed={completed}
							hasRecurrence={!!row.recurrence}
						/>
					)}
					<NodeTagPills tags={row.tags} />
				</div>
			</div>
			{expanded &&
				children.map((child) => (
					<SharedTreeNode
						key={child.id}
						row={child}
						depth={depth + 1}
						indentSize={indentSize}
						childrenByParent={childrenByParent}
						collapsed={collapsed}
						onToggleCollapse={onToggleCollapse}
					/>
				))}
		</>
	);
}
