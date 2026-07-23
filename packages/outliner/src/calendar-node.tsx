import { CalendarIcon, CircleNotchIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useState } from "react";
import type { CalendarDateString } from "./calendar-date";
import { useOutlinerLabels } from "./labels-context";
import type { BlockType } from "./lexical/lexical-content";
import { setBlockType } from "./lexical/lexical-content";
import type { LexicalElementNode } from "./lexical/read/lexical-read-view";
import type { FocusPoint } from "./node-editor";
import { DefaultNodeLink } from "./node-link-slot";
import type { TagSummary } from "./node-tags";
import { NodeToggle } from "./node-toggle";
import {
	defaultTypedMetadata,
	type NodeMetadata,
	type NodeTypeName,
	type TypedMetadata,
	type VisibleNodeRow,
} from "./node-types";
import {
	NodeRowContent,
	StaticRowShell,
} from "./virtual-tree/node-row-content";

export interface CalendarYearCount {
	year: number;
	count: number;
}
export interface CalendarMonthCount {
	month: number;
	count: number;
}
export interface CalendarDayCount {
	day: number;
	count: number;
}
export interface CalendarDueNode {
	id: string;
	content: unknown;
	type: NodeTypeName;
	metadata: NodeMetadata;
	tags: string[];
}

/** Real node mutations for the Calendar entry's due-node rows: the exact
 * same operations `VirtualTree` exposes, scoped by node id instead of
 * flowing through a shared tree cache, since a due node can live anywhere
 * in the outline, not just wherever is currently loaded. Content/type/tags/
 * due-date changes pass the pre-mutation value too (this component already
 * has it in hand) so the app can register an undo entry the same way it
 * does for the real tree, without needing a cache lookup of its own. */
export interface CalendarNodeActions {
	existingTags: TagSummary[];
	onDeleteTag?: (name: string) => void | Promise<void>;
	onTagClick?: (tag: string) => void;
	onDueDateClick?: (date: Date) => void;
	onSaveContent: (
		id: string,
		content: { root: LexicalElementNode },
		previousContent: { root: LexicalElementNode } | null,
	) => void;
	onSetType: (
		id: string,
		typed: TypedMetadata,
		previous: TypedMetadata,
	) => void;
	onSetDueDate: (
		id: string,
		date: Date | null,
		previousDate: CalendarDateString,
	) => void;
	onSetTags: (id: string, tags: string[], previousTags: string[]) => void;
	onDuplicate: (id: string) => void;
	onDelete: (id: string) => void;
}

export interface CalendarNodeProps extends CalendarNodeActions {
	loadYears: () => Promise<CalendarYearCount[]>;
	loadMonths: (year: number) => Promise<CalendarMonthCount[]>;
	loadDays: (year: number, month: number) => Promise<CalendarDayCount[]>;
	loadDayNodes: (date: CalendarDateString) => Promise<CalendarDueNode[]>;
	/** Same contract as `VirtualTreeProps.renderNodeLink`: the app supplies a
	 * link to a due node's real position in the outline. */
	renderNodeLink?: (node: Pick<CalendarDueNode, "id" | "content">) => ReactNode;
	indentSize?: number;
	/** Bump this (e.g. a counter) whenever a due date changed anywhere in the
	 * app — the real tree, another calendar row, undo/redo — so that any
	 * already-expanded year/month/day/day-node list here re-fetches instead
	 * of going stale. A no-op for branches that aren't expanded yet: they'll
	 * fetch fresh data the first time they're opened regardless. */
	refreshToken?: number;
}

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long" });
const dayFormatter = new Intl.DateTimeFormat(undefined, {
	weekday: "short",
	day: "numeric",
});

function toDateString(
	year: number,
	month: number,
	day: number,
): CalendarDateString {
	return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Wraps a row (structural or due-node) in the same `role="treeitem"`
 * semantics `VirtualTreeRow` uses for real rows. */
function CalendarTreeItem({
	depth,
	hasChildren,
	expanded,
	selected,
	children,
}: {
	depth: number;
	hasChildren: boolean;
	expanded: boolean;
	selected?: boolean;
	children: ReactNode;
}) {
	return (
		<div
			role="treeitem"
			tabIndex={-1}
			aria-level={depth + 1}
			aria-expanded={hasChildren ? expanded : undefined}
			aria-selected={selected}
		>
			{children}
		</div>
	);
}

interface StructuralRowProps {
	depth: number;
	indentSize: number;
	label: ReactNode;
	count?: number;
	expanded: boolean;
	loading: boolean;
	onToggle: (expanded: boolean) => void;
	/** Overrides the default dot marker — just for the root "Calendar" row,
	 * so it reads as the entry point into the calendar rather than a node. */
	icon?: ReactNode;
}

/** A Calendar/Year/Month/Day entry: styled identically to a real node row
 * (same shell, same text) since it isn't one — it has no content of its own
 * to edit, just a label and a count of due nodes. */
function StructuralRow({
	depth,
	indentSize,
	label,
	count,
	expanded,
	loading,
	onToggle,
	icon,
}: StructuralRowProps) {
	return (
		<CalendarTreeItem depth={depth} hasChildren expanded={expanded}>
			<StaticRowShell depth={depth} indentSize={indentSize}>
				<NodeToggle hasChildren expanded={expanded} onToggle={onToggle} />
				{icon ?? <DefaultNodeLink />}
				<span className="flex-1 min-w-0 truncate">{label}</span>
				<div className="flex gap-1 pr-1">
					{loading ? (
						<CircleNotchIcon size={12} className="animate-spin opacity-60" />
					) : count !== undefined ? (
						<span className="inline-flex items-center rounded-full border border-ink/15 dark:border-surface/15 px-2 py-0.5 text-xs text-muted dark:text-surface/60 tabular-nums">
							{count}
						</span>
					) : null}
				</div>
			</StaticRowShell>
		</CalendarTreeItem>
	);
}

interface DueNodeRowProps {
	node: CalendarDueNode;
	dueDate: CalendarDateString;
	depth: number;
	indentSize: number;
	renderNodeLink?: (node: Pick<CalendarDueNode, "id" | "content">) => ReactNode;
	actions: CalendarNodeActions;
	editingNodeId: string | null;
	focusPoint: FocusPoint | null;
	onStartEdit: (id: string, point?: FocusPoint) => void;
	onExitEdit: (id: string) => void;
	onPatch: (id: string, patch: Partial<CalendarDueNode>) => void;
	onRemove: (id: string) => void;
}

/** A due node's row, rendered with the exact same `NodeRowContent` real
 * tree rows use — same look, same editing, same context menu — just not
 * draggable (it isn't part of an orderable sibling list here) and scoped to
 * this one node rather than a shared tree cache. */
function DueNodeRow({
	node,
	dueDate,
	depth,
	indentSize,
	renderNodeLink,
	actions,
	editingNodeId,
	focusPoint,
	onStartEdit,
	onExitEdit,
	onPatch,
	onRemove,
}: DueNodeRowProps) {
	const row: VisibleNodeRow = {
		id: node.id,
		parentId: null,
		content: node.content,
		type: node.type,
		metadata: node.metadata,
		expanded: false,
		order: node.id,
		dueDate,
		tags: node.tags,
		depth,
		path: [],
		hasChildren: false,
		isLastChild: true,
	};
	const editing = editingNodeId === node.id;

	return (
		<CalendarTreeItem
			depth={depth}
			hasChildren={false}
			expanded={false}
			selected={editing}
		>
			<NodeRowContent
				row={row}
				rows={[]}
				indentSize={indentSize}
				renderNodeLink={renderNodeLink}
				existingTags={actions.existingTags}
				onDeleteTag={actions.onDeleteTag}
				onTagClick={actions.onTagClick}
				onDueDateClick={actions.onDueDateClick}
				editing={editing}
				focusPoint={editing ? focusPoint : null}
				onStartEdit={(point) => onStartEdit(node.id, point)}
				onExitEdit={() => onExitEdit(node.id)}
				onToggle={() => {}}
				onConvert={(type: NodeTypeName) => {
					const previous = {
						type: node.type,
						metadata: node.metadata,
					} as TypedMetadata;
					const typed = defaultTypedMetadata(type);
					onPatch(node.id, { type: typed.type, metadata: typed.metadata });
					actions.onSetType(node.id, typed, previous);
				}}
				onTurnInto={(blockType: BlockType) => {
					const previousContent = node.content as {
						root: LexicalElementNode;
					} | null;
					const updated = setBlockType(node.content, blockType);
					onPatch(node.id, { content: updated });
					actions.onSaveContent(node.id, updated, previousContent);
				}}
				onToggleTask={(completed: boolean) => {
					const previous = {
						type: node.type,
						metadata: node.metadata,
					} as TypedMetadata;
					onPatch(node.id, { type: "task", metadata: { completed } });
					actions.onSetType(
						node.id,
						{ type: "task", metadata: { completed } },
						previous,
					);
				}}
				onSetDueDate={(date: Date | null) => {
					onRemove(node.id);
					actions.onSetDueDate(node.id, date, dueDate);
				}}
				onSetTags={(tags: string[]) => {
					const previousTags = node.tags;
					onPatch(node.id, { tags });
					actions.onSetTags(node.id, tags, previousTags);
				}}
				onDuplicate={() => actions.onDuplicate(node.id)}
				onDelete={() => {
					onRemove(node.id);
					actions.onDelete(node.id);
				}}
				onSaveContent={(content) => {
					const previousContent = node.content as {
						root: LexicalElementNode;
					} | null;
					onPatch(node.id, { content });
					actions.onSaveContent(node.id, content, previousContent);
				}}
				draggable={false}
			/>
		</CalendarTreeItem>
	);
}

interface CalendarDayRowProps {
	year: number;
	month: number;
	day: number;
	count: number;
	depth: number;
	indentSize: number;
	loadDayNodes: (date: CalendarDateString) => Promise<CalendarDueNode[]>;
	renderNodeLink?: (node: Pick<CalendarDueNode, "id" | "content">) => ReactNode;
	actions: CalendarNodeActions;
	editingNodeId: string | null;
	focusPoint: FocusPoint | null;
	onStartEdit: (id: string, point?: FocusPoint) => void;
	onExitEdit: (id: string) => void;
	refreshToken?: number;
}

function CalendarDayRow({
	year,
	month,
	day,
	count,
	depth,
	indentSize,
	loadDayNodes,
	renderNodeLink,
	actions,
	editingNodeId,
	focusPoint,
	onStartEdit,
	onExitEdit,
	refreshToken,
}: CalendarDayRowProps) {
	const [expanded, setExpanded] = useState(false);
	const [dueNodes, setDueNodes] = useState<CalendarDueNode[] | null>(null);
	const [loading, setLoading] = useState(false);
	const dueDate = toDateString(year, month, day);

	async function handleToggle(next: boolean) {
		setExpanded(next);
		if (next && dueNodes === null && !loading) {
			setLoading(true);
			try {
				setDueNodes(await loadDayNodes(dueDate));
			} finally {
				setLoading(false);
			}
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-fetches on refreshToken changes, not on every loadDayNodes/dueDate identity change
	useEffect(() => {
		if (dueNodes === null) return;
		loadDayNodes(dueDate).then(setDueNodes);
	}, [refreshToken]);

	function patchNode(id: string, patch: Partial<CalendarDueNode>) {
		setDueNodes(
			(current) =>
				current?.map((n) => (n.id === id ? { ...n, ...patch } : n)) ?? current,
		);
	}

	// A due-date change or delete means the node no longer belongs in this
	// day's bucket; drop it locally instead of waiting on a refetch.
	function removeNode(id: string) {
		setDueNodes((current) => current?.filter((n) => n.id !== id) ?? current);
	}

	return (
		<>
			<StructuralRow
				depth={depth}
				indentSize={indentSize}
				label={dayFormatter.format(new Date(year, month - 1, day))}
				count={count}
				expanded={expanded}
				loading={loading}
				onToggle={handleToggle}
			/>
			{expanded &&
				dueNodes?.map((node) => (
					<DueNodeRow
						key={node.id}
						node={node}
						dueDate={dueDate}
						depth={depth + 1}
						indentSize={indentSize}
						renderNodeLink={renderNodeLink}
						actions={actions}
						editingNodeId={editingNodeId}
						focusPoint={focusPoint}
						onStartEdit={onStartEdit}
						onExitEdit={onExitEdit}
						onPatch={patchNode}
						onRemove={removeNode}
					/>
				))}
		</>
	);
}

interface CalendarMonthRowProps {
	year: number;
	month: number;
	count: number;
	depth: number;
	indentSize: number;
	loadDays: (year: number, month: number) => Promise<CalendarDayCount[]>;
	loadDayNodes: (date: CalendarDateString) => Promise<CalendarDueNode[]>;
	renderNodeLink?: (node: Pick<CalendarDueNode, "id" | "content">) => ReactNode;
	actions: CalendarNodeActions;
	editingNodeId: string | null;
	focusPoint: FocusPoint | null;
	onStartEdit: (id: string, point?: FocusPoint) => void;
	onExitEdit: (id: string) => void;
	refreshToken?: number;
}

function CalendarMonthRow({
	year,
	month,
	count,
	depth,
	indentSize,
	loadDays,
	loadDayNodes,
	renderNodeLink,
	actions,
	editingNodeId,
	focusPoint,
	onStartEdit,
	onExitEdit,
	refreshToken,
}: CalendarMonthRowProps) {
	const [expanded, setExpanded] = useState(false);
	const [days, setDays] = useState<CalendarDayCount[] | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleToggle(next: boolean) {
		setExpanded(next);
		if (next && days === null && !loading) {
			setLoading(true);
			try {
				setDays(await loadDays(year, month));
			} finally {
				setLoading(false);
			}
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-fetches on refreshToken changes, not on every loadDays/year/month identity change
	useEffect(() => {
		if (days === null) return;
		loadDays(year, month).then(setDays);
	}, [refreshToken]);

	return (
		<>
			<StructuralRow
				depth={depth}
				indentSize={indentSize}
				label={monthFormatter.format(new Date(year, month - 1, 1))}
				count={count}
				expanded={expanded}
				loading={loading}
				onToggle={handleToggle}
			/>
			{expanded &&
				days?.map((d) => (
					<CalendarDayRow
						key={d.day}
						year={year}
						month={month}
						day={d.day}
						count={d.count}
						depth={depth + 1}
						indentSize={indentSize}
						loadDayNodes={loadDayNodes}
						renderNodeLink={renderNodeLink}
						actions={actions}
						editingNodeId={editingNodeId}
						focusPoint={focusPoint}
						onStartEdit={onStartEdit}
						onExitEdit={onExitEdit}
						refreshToken={refreshToken}
					/>
				))}
		</>
	);
}

interface CalendarYearRowProps {
	year: number;
	count: number;
	depth: number;
	indentSize: number;
	loadMonths: (year: number) => Promise<CalendarMonthCount[]>;
	loadDays: (year: number, month: number) => Promise<CalendarDayCount[]>;
	loadDayNodes: (date: CalendarDateString) => Promise<CalendarDueNode[]>;
	renderNodeLink?: (node: Pick<CalendarDueNode, "id" | "content">) => ReactNode;
	actions: CalendarNodeActions;
	editingNodeId: string | null;
	focusPoint: FocusPoint | null;
	onStartEdit: (id: string, point?: FocusPoint) => void;
	onExitEdit: (id: string) => void;
	refreshToken?: number;
}

function CalendarYearRow({
	year,
	count,
	depth,
	indentSize,
	loadMonths,
	loadDays,
	loadDayNodes,
	renderNodeLink,
	actions,
	editingNodeId,
	focusPoint,
	onStartEdit,
	onExitEdit,
	refreshToken,
}: CalendarYearRowProps) {
	const [expanded, setExpanded] = useState(false);
	const [months, setMonths] = useState<CalendarMonthCount[] | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleToggle(next: boolean) {
		setExpanded(next);
		if (next && months === null && !loading) {
			setLoading(true);
			try {
				setMonths(await loadMonths(year));
			} finally {
				setLoading(false);
			}
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-fetches on refreshToken changes, not on every loadMonths/year identity change
	useEffect(() => {
		if (months === null) return;
		loadMonths(year).then(setMonths);
	}, [refreshToken]);

	return (
		<>
			<StructuralRow
				depth={depth}
				indentSize={indentSize}
				label={year}
				count={count}
				expanded={expanded}
				loading={loading}
				onToggle={handleToggle}
			/>
			{expanded &&
				months?.map((m) => (
					<CalendarMonthRow
						key={m.month}
						year={year}
						month={m.month}
						count={m.count}
						depth={depth + 1}
						indentSize={indentSize}
						loadDays={loadDays}
						loadDayNodes={loadDayNodes}
						renderNodeLink={renderNodeLink}
						actions={actions}
						editingNodeId={editingNodeId}
						focusPoint={focusPoint}
						onStartEdit={onStartEdit}
						onExitEdit={onExitEdit}
						refreshToken={refreshToken}
					/>
				))}
		</>
	);
}

/**
 * Always-present "Calendar" entry: drills down Year → Month → Day,
 * populated live from nodes' due dates (only buckets that actually have a
 * due node appear at any level — see `node-calendar.procedures.ts`). A due
 * node keeps living at its real position in the outline; this is an
 * alternate projection over the same rows, not a second copy — but its rows
 * render with the same `NodeRowContent` real tree rows do, so a due node
 * shown here is fully editable in place.
 *
 * Meant to be passed as `VirtualTreeProps.treeLeading`, not rendered
 * standalone: it has no `role="tree"`/wrapper of its own so its rows read
 * as the first entries of the outline's own tree, not a separate panel.
 */
export function CalendarNode({
	loadYears,
	loadMonths,
	loadDays,
	loadDayNodes,
	renderNodeLink,
	indentSize = 16,
	refreshToken,
	...actions
}: CalendarNodeProps) {
	const labels = useOutlinerLabels();
	const [expanded, setExpanded] = useState(false);
	const [years, setYears] = useState<CalendarYearCount[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
	const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);

	async function handleToggle(next: boolean) {
		setExpanded(next);
		if (next && years === null && !loading) {
			setLoading(true);
			try {
				setYears(await loadYears());
			} finally {
				setLoading(false);
			}
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-fetches on refreshToken changes, not on every loadYears identity change
	useEffect(() => {
		if (years === null) return;
		loadYears().then(setYears);
	}, [refreshToken]);

	const handleStartEdit = (id: string, point?: FocusPoint) => {
		setEditingNodeId(id);
		setFocusPoint(point ?? null);
	};
	const handleExitEdit = (id: string) => {
		setEditingNodeId((current) => (current === id ? null : current));
	};

	return (
		<>
			<StructuralRow
				depth={0}
				indentSize={indentSize}
				label={labels.calendarTitle}
				expanded={expanded}
				loading={loading}
				onToggle={handleToggle}
				icon={<CalendarIcon size={14} weight="bold" />}
			/>
			{expanded && years !== null && years.length === 0 && (
				<div
					className="px-2 py-1.5 text-sm text-muted dark:text-surface/60"
					style={{ paddingLeft: indentSize + 8 }}
				>
					{labels.calendarEmpty}
				</div>
			)}
			{expanded &&
				years?.map((y) => (
					<CalendarYearRow
						key={y.year}
						year={y.year}
						count={y.count}
						depth={1}
						indentSize={indentSize}
						loadMonths={loadMonths}
						loadDays={loadDays}
						loadDayNodes={loadDayNodes}
						renderNodeLink={renderNodeLink}
						actions={actions}
						editingNodeId={editingNodeId}
						focusPoint={focusPoint}
						onStartEdit={handleStartEdit}
						onExitEdit={handleExitEdit}
						refreshToken={refreshToken}
					/>
				))}
		</>
	);
}
