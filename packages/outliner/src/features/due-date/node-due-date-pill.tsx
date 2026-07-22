import { Calendar } from "@cascade/ui/calendar";
import { cva } from "@cascade/ui/cva.config";
import { Popover, PopoverContent, PopoverTrigger } from "@cascade/ui/popover";
import {
	CalendarDotIcon,
	CalendarDotsIcon,
	CalendarIcon,
} from "@phosphor-icons/react/ssr";
import { dueBucket, startOfDay } from "../../due-date-bucket";
import { type OutlinerLabels, useOutlinerLabels } from "../../labels-context";

interface NodeDueDatePillProps {
	dueDate: Date;
	completed: boolean;
	onChange: (date: Date | null) => void;
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

function formatDuePill(
	dueDate: Date,
	labels: Pick<OutlinerLabels, "dueToday" | "dueTomorrow" | "dueYesterday">,
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

const pill = cva({
	base: [
		"inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums whitespace-nowrap outline-none",
		"hover:ring-1 hover:ring-inset hover:ring-current/40",
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

/** The pill's visual content (icon + label) shared between the interactive
 * `NodeDueDatePill` and the read-only `StaticDueDatePill` (used in version
 * history previews, where there's nothing to click into). */
export function DueDatePillContent({ dueDate }: { dueDate: Date }) {
	const labels = useOutlinerLabels();
	return (
		<>
			<span className="shrink-0">{pillIcon(dueDate)}</span>
			<span className="truncate">{formatDuePill(dueDate, labels)}</span>
		</>
	);
}

export function duePillClassName(dueDate: Date, completed: boolean): string {
	return pill({ bucket: dueBucket(dueDate, completed) });
}

export function NodeDueDatePill({
	dueDate,
	completed,
	onChange,
}: NodeDueDatePillProps) {
	const labels = useOutlinerLabels();

	return (
		<Popover>
			<PopoverTrigger
				className={duePillClassName(dueDate, completed)}
				aria-label={labels.changeDueDateAria}
				onClick={(e) => e.stopPropagation()}
			>
				<DueDatePillContent dueDate={dueDate} />
			</PopoverTrigger>
			<PopoverContent>
				<Calendar
					value={dueDate}
					onSelect={onChange}
					onClear={() => onChange(null)}
				/>
			</PopoverContent>
		</Popover>
	);
}

/** Read-only due-date pill: same look as `NodeDueDatePill`, no popover to
 * edit it, for contexts like a deleted-subtree preview where the node isn't
 * live and there's nothing to change. */
export function StaticDueDatePill({
	dueDate,
	completed,
}: {
	dueDate: Date;
	completed: boolean;
}) {
	return (
		<span className={duePillClassName(dueDate, completed)}>
			<DueDatePillContent dueDate={dueDate} />
		</span>
	);
}
