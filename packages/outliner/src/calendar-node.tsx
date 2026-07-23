import { CalendarIcon, CircleNotchIcon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import type { CalendarDateString } from "./calendar-date";
import { useOutlinerLabels } from "./labels-context";
import { lexicalToPlainText } from "./lexical/lexical-content";
import { NodeToggle } from "./node-toggle";

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
}

export interface CalendarNodeProps {
	loadYears: () => Promise<CalendarYearCount[]>;
	loadMonths: (year: number) => Promise<CalendarMonthCount[]>;
	loadDays: (year: number, month: number) => Promise<CalendarDayCount[]>;
	loadDayNodes: (date: CalendarDateString) => Promise<CalendarDueNode[]>;
	/** Same contract as `VirtualTreeProps.renderNodeLink`: the app supplies a
	 * link to a due node's real position in the outline. */
	renderNodeLink: (node: CalendarDueNode) => ReactNode;
	indentSize?: number;
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

interface CalendarRowProps {
	depth: number;
	indentSize: number;
	icon?: ReactNode;
	label: ReactNode;
	count?: number;
	hasChildren: boolean;
	expanded: boolean;
	loading: boolean;
	onToggle: (expanded: boolean) => void;
}

function CalendarRow({
	depth,
	indentSize,
	icon,
	label,
	count,
	hasChildren,
	expanded,
	loading,
	onToggle,
}: CalendarRowProps) {
	return (
		<div
			role="treeitem"
			// Focus lives on the nested toggle button, same as VirtualTreeRow.
			tabIndex={-1}
			aria-expanded={hasChildren ? expanded : undefined}
			className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-ink dark:text-surface"
			style={{ paddingLeft: depth * indentSize + 8 }}
		>
			<NodeToggle
				hasChildren={hasChildren}
				expanded={expanded}
				onToggle={onToggle}
			/>
			{icon}
			<span className="truncate font-medium">{label}</span>
			{loading ? (
				<CircleNotchIcon size={12} className="animate-spin opacity-60" />
			) : count !== undefined ? (
				<span className="text-xs text-muted dark:text-surface/60 tabular-nums">
					{count}
				</span>
			) : null}
		</div>
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
	renderNodeLink: (node: CalendarDueNode) => ReactNode;
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
}: CalendarDayRowProps) {
	const [expanded, setExpanded] = useState(false);
	const [dueNodes, setDueNodes] = useState<CalendarDueNode[] | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleToggle(next: boolean) {
		setExpanded(next);
		if (next && dueNodes === null && !loading) {
			setLoading(true);
			try {
				setDueNodes(await loadDayNodes(toDateString(year, month, day)));
			} finally {
				setLoading(false);
			}
		}
	}

	return (
		<>
			<CalendarRow
				depth={depth}
				indentSize={indentSize}
				label={dayFormatter.format(new Date(year, month - 1, day))}
				count={count}
				hasChildren
				expanded={expanded}
				loading={loading}
				onToggle={handleToggle}
			/>
			{expanded &&
				dueNodes?.map((node) => (
					<div
						key={node.id}
						className="flex items-center gap-2 px-2 py-1.5 text-sm text-ink dark:text-surface"
						style={{ paddingLeft: (depth + 1) * indentSize + 8 }}
					>
						{renderNodeLink(node)}
						<span className="truncate">
							{lexicalToPlainText(node.content, 120)}
						</span>
					</div>
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
	renderNodeLink: (node: CalendarDueNode) => ReactNode;
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

	return (
		<>
			<CalendarRow
				depth={depth}
				indentSize={indentSize}
				label={monthFormatter.format(new Date(year, month - 1, 1))}
				count={count}
				hasChildren
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
	renderNodeLink: (node: CalendarDueNode) => ReactNode;
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

	return (
		<>
			<CalendarRow
				depth={depth}
				indentSize={indentSize}
				label={year}
				count={count}
				hasChildren
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
					/>
				))}
		</>
	);
}

/**
 * Always-present, read-only "Calendar" entry: drills down Year → Month →
 * Day, populated live from nodes' due dates (only buckets that actually
 * have a due node appear at any level — see `node-calendar.procedures.ts`).
 * A due node keeps living at its real position in the outline; this is an
 * alternate projection over the same rows, not a second copy, so clicking
 * a node here navigates to it via `renderNodeLink` rather than editing it
 * in place.
 */
export function CalendarNode({
	loadYears,
	loadMonths,
	loadDays,
	loadDayNodes,
	renderNodeLink,
	indentSize = 16,
}: CalendarNodeProps) {
	const labels = useOutlinerLabels();
	const [expanded, setExpanded] = useState(false);
	const [years, setYears] = useState<CalendarYearCount[] | null>(null);
	const [loading, setLoading] = useState(false);

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

	return (
		<div
			role="tree"
			aria-label={labels.calendarTitle}
			className="border-b border-ink/10 dark:border-surface/10"
		>
			<CalendarRow
				depth={0}
				indentSize={indentSize}
				icon={<CalendarIcon size={14} weight="bold" />}
				label={labels.calendarTitle}
				hasChildren
				expanded={expanded}
				loading={loading}
				onToggle={handleToggle}
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
					/>
				))}
		</div>
	);
}
