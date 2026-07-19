import { Calendar } from "@cascade/ui/calendar";
import { cva } from "@cascade/ui/cva.config";
import { Popover, PopoverContent, PopoverTrigger } from "@cascade/ui/popover";
import {
	CalendarDotIcon,
	CalendarDotsIcon,
	CalendarIcon,
} from "@phosphor-icons/react/ssr";
import { dueBucket, startOfDay } from "./due-date-bucket";
import { type OutlinerLabels, useOutlinerLabels } from "./labels-context";

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

export function NodeDueDatePill({
	dueDate,
	completed,
	onChange,
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
				<span className="truncate">{formatDuePill(dueDate, labels)}</span>
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
