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
import { useVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

// Mirrors use-tree-virtualizer.ts's threshold for when to fetch the next
// page while scrolling, so a large shared tree keeps loading ahead the same
// way the owner's own tree does.
const LOAD_MORE_THRESHOLD = 50;
const ROW_ESTIMATE_SIZE = 36;

interface SharedTreeViewProps {
	rootId: string;
	rows: VisibleNodeRow[];
	indentSize?: number;
	header?: ReactNode;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	onLoadMore: () => void;
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
 * Read-only rendering of a shared subtree, virtualized and styled to match
 * the real, editable tree row-for-row (same toggle, checkbox, link dot,
 * due-date pill, and tag pills), but with every interactive affordance
 * either omitted or wired to a no-op — there's no editor, drag-and-drop, or
 * context menu here, so there's no UI path to mutate the owner's tree
 * regardless of what the API would allow. Only the currently expanded rows
 * are mounted, same as the owner's tree, so large shared trees stay fast to
 * render and scroll.
 */
export function SharedTreeView({
	rootId,
	rows,
	indentSize = 16,
	header,
	hasNextPage,
	isFetchingNextPage,
	onLoadMore,
}: SharedTreeViewProps) {
	const labels = useOutlinerLabels();
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

	// Flat, depth-first list of every currently expanded row — the same
	// shape `visibleTree`'s rows already are for the owner's tree — so it
	// can be windowed by the virtualizer below instead of mounting every
	// descendant regardless of collapse state.
	const visibleRows = useMemo(() => {
		const root = rows.find((row) => row.id === rootId);
		if (!root) return [];
		const result: VisibleNodeRow[] = [];
		const visit = (row: VisibleNodeRow) => {
			result.push(row);
			if (collapsed.has(row.id)) return;
			for (const child of childrenByParent.get(row.id) ?? []) visit(child);
		};
		visit(root);
		return result;
	}, [rows, rootId, childrenByParent, collapsed]);

	const scrollRef = useRef<HTMLDivElement>(null);
	const virtualizer = useVirtualizer({
		count: visibleRows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => ROW_ESTIMATE_SIZE,
		overscan: 10,
		getItemKey: (index) => visibleRows[index]?.id ?? index,
	});
	const virtualItems = virtualizer.getVirtualItems();
	const lastIndex = virtualItems[virtualItems.length - 1]?.index ?? 0;

	useEffect(() => {
		if (
			hasNextPage &&
			!isFetchingNextPage &&
			lastIndex >= visibleRows.length - LOAD_MORE_THRESHOLD
		) {
			onLoadMore();
		}
	}, [
		lastIndex,
		hasNextPage,
		isFetchingNextPage,
		visibleRows.length,
		onLoadMore,
	]);

	const toggleCollapse = (id: string) =>
		setCollapsed((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	return (
		<div ref={scrollRef} className="isolate h-dvh overflow-auto">
			<div className="mx-auto max-w-6xl px-4 py-16">
				{header}
				<div
					role="tree"
					aria-label={labels.treeLabel}
					style={{ height: virtualizer.getTotalSize(), position: "relative" }}
				>
					{virtualItems.map((virtualItem) => {
						const row = visibleRows[virtualItem.index];
						if (!row) return null;
						return (
							<SharedTreeRow
								key={virtualItem.key}
								row={row}
								index={virtualItem.index}
								start={virtualItem.start}
								indentSize={indentSize}
								expanded={!collapsed.has(row.id)}
								measureElement={virtualizer.measureElement}
								onToggleCollapse={toggleCollapse}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function SharedTreeRow({
	row,
	index,
	start,
	indentSize,
	expanded,
	measureElement,
	onToggleCollapse,
}: {
	row: VisibleNodeRow;
	index: number;
	start: number;
	indentSize: number;
	expanded: boolean;
	measureElement: (element: HTMLElement | null) => void;
	onToggleCollapse: (id: string) => void;
}) {
	const completed =
		row.type === "task" &&
		((row.metadata as NodeMetadataOf<"task"> | null)?.completed ?? false);
	const dueDate = row.dueDate ? parseCalendarDate(row.dueDate) : null;

	return (
		<div
			ref={measureElement}
			data-index={index}
			role="treeitem"
			tabIndex={-1}
			aria-level={row.depth + 1}
			aria-expanded={row.hasChildren ? expanded : undefined}
			className="top-0 left-0 w-full absolute"
			style={{ transform: `translateY(${start}px)` }}
		>
			<div className="group/node relative flex items-center gap-2 rounded-md py-1">
				<div style={{ paddingLeft: row.depth * indentSize }} />
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
					hasChildren={row.hasChildren}
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
		</div>
	);
}
