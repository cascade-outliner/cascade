import { Calendar } from "@cascade/ui/calendar";
import { cva } from "@cascade/ui/cva.config";
import { Popover, PopoverContent, PopoverTrigger } from "@cascade/ui/popover";
import { CalendarIcon } from "@phosphor-icons/react/ssr";
import { type OutlinerLabels, useOutlinerLabels } from "./labels-context";

interface NodeDueDatePillProps {
	dueDate: Date;
	completed: boolean;
	onChange: (date: Date | null) => void;
}

type DueBucket = "overdue" | "today" | "upcoming" | "completed";

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dueBucket(dueDate: Date, completed: boolean): DueBucket {
	if (completed) return "completed";
	const diffDays = Math.round(
		(startOfDay(dueDate).getTime() - startOfDay(new Date()).getTime()) /
			86_400_000,
	);
	if (diffDays < 0) return "overdue";
	if (diffDays === 0) return "today";
	return "upcoming";
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

const pill = cva({
	base: [
		"inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 mr-1 text-[11.5px] font-medium tabular-nums outline-none",
		"transition-shadow hover:ring-1 hover:ring-inset hover:ring-current/40",
	],
	variants: {
		bucket: {
			overdue:
				"border-redleather/30 bg-redleather/10 text-redleather dark:border-redleather/35 dark:bg-redleather/15",
			today:
				"border-peach/50 bg-peach/25 text-dark-grey dark:border-peach/40 dark:bg-peach/20 dark:text-ginger",
			upcoming:
				"border-dark-grey/15 bg-transparent text-graphite dark:border-ginger/15 dark:text-ginger/60",
			completed:
				"border-dark-grey/10 bg-transparent text-graphite opacity-70 dark:border-ginger/10 dark:text-super-ginger/30",
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
				<CalendarIcon size={11} weight="bold" />
				{formatDuePill(dueDate, labels)}
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
