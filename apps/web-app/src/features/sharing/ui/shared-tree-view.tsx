import { parseCalendarDate } from "@cascade/outliner/calendar-date";
import { LexicalReadView } from "@cascade/outliner/lexical/read/lexical-read-view";
import { toLexicalContent } from "@cascade/outliner/lexical-content";
import type {
	NodeMetadataOf,
	VisibleNodeRow,
} from "@cascade/outliner/node-types";
import {
	CaretRightIcon,
	CheckSquareIcon,
	SquareIcon,
} from "@phosphor-icons/react/ssr";
import { useMemo, useState } from "react";

interface SharedTreeViewProps {
	rootId: string;
	rows: VisibleNodeRow[];
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
	year: "numeric",
});

/**
 * Purely presentational, read-only rendering of a shared subtree: no editor,
 * no drag-and-drop, no menus. Every control here is inert by construction —
 * this view has nothing wired to a mutation, so there's no path from this
 * page to editing the owner's tree regardless of what the API would allow.
 */
export function SharedTreeView({ rootId, rows }: SharedTreeViewProps) {
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

	const root = rows.find((row) => row.id === rootId);
	if (!root) return null;

	return (
		<SharedTreeNode
			row={root}
			depth={0}
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
	);
}

function SharedTreeNode({
	row,
	depth,
	childrenByParent,
	collapsed,
	onToggleCollapse,
}: {
	row: VisibleNodeRow;
	depth: number;
	childrenByParent: Map<string | null, VisibleNodeRow[]>;
	collapsed: Set<string>;
	onToggleCollapse: (id: string) => void;
}) {
	const children = childrenByParent.get(row.id) ?? [];
	const isCollapsed = collapsed.has(row.id);
	const completed =
		row.type === "task" &&
		((row.metadata as NodeMetadataOf<"task"> | null)?.completed ?? false);

	return (
		<div>
			<div
				className="flex items-start gap-2 py-1"
				style={{ paddingLeft: depth * 24 }}
			>
				<span className="mt-1 flex size-4 shrink-0 items-center justify-center">
					{children.length > 0 && (
						<button
							type="button"
							aria-label={isCollapsed ? "Expand" : "Collapse"}
							className={`cursor-pointer text-ink/40 transition-transform dark:text-surface/40 ${isCollapsed ? "" : "rotate-90"}`}
							onClick={() => onToggleCollapse(row.id)}
						>
							<CaretRightIcon size={14} weight="bold" />
						</button>
					)}
				</span>
				{row.type === "task" &&
					(completed ? (
						<CheckSquareIcon
							size={18}
							weight="fill"
							className="mt-0.5 shrink-0 text-ink/40 dark:text-surface/40"
						/>
					) : (
						<SquareIcon
							size={18}
							className="mt-0.5 shrink-0 text-ink/40 dark:text-surface/40"
						/>
					))}
				<div className="min-w-0 flex-1">
					<div
						className={
							completed ? "text-ink/50 line-through dark:text-surface/50" : ""
						}
					>
						<LexicalReadView content={toLexicalContent(row.content)} />
					</div>
					{(row.dueDate || row.tags.length > 0) && (
						<div className="mt-1 flex flex-wrap items-center gap-1.5 text-ink/50 text-xs dark:text-surface/50">
							{row.dueDate && (
								<span className="rounded-full bg-ink/5 px-2 py-0.5 dark:bg-surface/10">
									{dateFormatter.format(parseCalendarDate(row.dueDate))}
								</span>
							)}
							{row.tags.map((tag) => (
								<span
									key={tag}
									className="rounded-full bg-ink/5 px-2 py-0.5 dark:bg-surface/10"
								>
									{tag}
								</span>
							))}
						</div>
					)}
				</div>
			</div>
			{!isCollapsed &&
				children.map((child) => (
					<SharedTreeNode
						key={child.id}
						row={child}
						depth={depth + 1}
						childrenByParent={childrenByParent}
						collapsed={collapsed}
						onToggleCollapse={onToggleCollapse}
					/>
				))}
		</div>
	);
}
