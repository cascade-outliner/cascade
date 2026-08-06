import { cva } from "@cascade/ui/cva.config";
import { Popover, PopoverContent, PopoverTrigger } from "@cascade/ui/popover";
import {
	ArrowsClockwiseIcon,
	CalendarDotIcon,
	CalendarDotsIcon,
	CalendarIcon,
} from "@phosphor-icons/react/ssr";
import type { CalendarTimeString } from "../../../dates/calendar-time";
import { dueBucket, startOfDay } from "../../../dates/due-date-bucket";
import type {
	RecurrenceInput,
	RecurrenceRule,
} from "../../../dates/recurrence";
import {
	type OutlinerLabels,
	useOutlinerLabels,
} from "../../../i18n/outliner-labels-context";
import { DueDateEditor } from "./due-date-editor";

interface NodeDueDatePillProps {
	dueDate: Date;
	dueTime: CalendarTimeString | null;
	completed: boolean;
	recurrence: RecurrenceRule | null;
	recurrenceEnabled: boolean;
	onChange: (date: Date | null, time: CalendarTimeString | null) => void;
	onRecurrenceChange: (recurrence: RecurrenceInput | null) => void;
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
const timeFormatter = new Intl.DateTimeFormat(undefined, {
	hour: "numeric",
	minute: "2-digit",
});

function formatDuePill(
	dueDate: Date,
	dueTime: CalendarTimeString | null,
	labels: Pick<OutlinerLabels, "dueToday" | "dueTomorrow" | "dueYesterday">,
): string {
	const diffDays = Math.round(
		(startOfDay(dueDate).getTime() - startOfDay(new Date()).getTime()) /
			86_400_000,
	);
	const day =
		diffDays === 0
			? labels.dueToday
			: diffDays === 1
				? labels.dueTomorrow
				: diffDays === -1
					? labels.dueYesterday
					: (dueDate.getFullYear() === new Date().getFullYear()
							? shortDateFormatter
							: shortDateWithYearFormatter
						).format(dueDate);
	if (!dueTime) return day;
	const [hours, minutes] = dueTime.split(":").map(Number);
	const withTime = new Date(dueDate);
	withTime.setHours(hours, minutes, 0, 0);
	return `${day} · ${timeFormatter.format(withTime)}`;
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

export function NodeDueDatePill({
	dueDate,
	dueTime,
	completed,
	recurrence,
	recurrenceEnabled,
	onChange,
	onRecurrenceChange,
}: NodeDueDatePillProps) {
	const labels = useOutlinerLabels();
	const bucket = dueBucket(dueDate, completed);

	return (
		<Popover>
			<PopoverTrigger
				className={pill({ bucket })}
				aria-label={labels.changeDueDateAria}
				onClick={(e) => e.stopPropagation()}
			>
				<span className="shrink-0">{pillIcon(dueDate)}</span>
				<span className="truncate">
					{formatDuePill(dueDate, dueTime, labels)}
				</span>
				{recurrence && <ArrowsClockwiseIcon size={11} weight="bold" />}
			</PopoverTrigger>
			<PopoverContent>
				<DueDateEditor
					dueDate={dueDate}
					dueTime={dueTime}
					recurrence={recurrence}
					recurrenceEnabled={recurrenceEnabled}
					onChangeDate={onChange}
					onChangeRecurrence={onRecurrenceChange}
				/>
			</PopoverContent>
		</Popover>
	);
}
