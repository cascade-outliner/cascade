import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { cva } from "./cva.config";
import { useUiLabels } from "./labels-context";

export interface CalendarProps {
	value: Date | null;
	onSelect: (date: Date) => void;
	onClear?: () => void;
}

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function sameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

interface CalendarCell {
	date: Date;
	inMonth: boolean;
}

function getMonthGrid(cursor: Date): CalendarCell[] {
	const year = cursor.getFullYear();
	const month = cursor.getMonth();
	const startOffset = new Date(year, month, 1).getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();

	const cells: CalendarCell[] = [];
	for (let i = 0; i < startOffset; i++) {
		cells.push({
			date: new Date(year, month, i - startOffset + 1),
			inMonth: false,
		});
	}
	for (let d = 1; d <= daysInMonth; d++) {
		cells.push({ date: new Date(year, month, d), inMonth: true });
	}
	const remainder = cells.length % 7;
	for (let i = 1; i <= (remainder === 0 ? 0 : 7 - remainder); i++) {
		cells.push({
			date: new Date(year, month, daysInMonth + i),
			inMonth: false,
		});
	}
	return cells;
}

const monthFormatter = new Intl.DateTimeFormat(undefined, {
	month: "long",
	year: "numeric",
});
const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
	weekday: "short",
});
// 1970-01-04 was a Sunday; used only as an anchor to read localized weekday names.
const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, i) =>
	weekdayFormatter.format(new Date(1970, 0, 4 + i)),
);

const navButton = cva({
	base: [
		"flex size-[22px] items-center justify-center rounded-md text-graphite outline-none transition-colors",
		"hover:bg-ginger/70 hover:text-dark-grey",
		"dark:text-ginger/80 dark:hover:bg-ginger/20 dark:hover:text-ginger",
	],
});

const day = cva({
	base: [
		"flex h-7 items-center justify-center rounded-md text-[12.5px] tabular-nums outline-none transition-colors",
		"text-dark-grey hover:bg-ginger/70 dark:text-ginger dark:hover:bg-ginger/20",
	],
	variants: {
		muted: { true: "opacity-35 dark:opacity-50", false: "" },
		today: { true: "font-semibold ring-1 ring-inset ring-peach", false: "" },
		selected: {
			true: "bg-redleather font-semibold text-super-ginger hover:bg-redleather dark:hover:bg-redleather",
			false: "",
		},
	},
});

const quick = cva({
	base: [
		"rounded-full border border-dark-grey/15 px-2.5 py-1 text-[11.5px] outline-none transition-colors",
		"text-dark-grey hover:bg-ginger/70",
		"dark:border-ginger/15 dark:text-ginger dark:hover:bg-ginger/20",
	],
	variants: {
		variant: {
			default: "",
			clear:
				"ml-auto border-redleather/30 text-redleather hover:bg-redleather/10",
		},
	},
	defaultVariants: { variant: "default" },
});

export function Calendar({ value, onSelect, onClear }: CalendarProps) {
	const labels = useUiLabels();
	const [cursor, setCursor] = useState(() => startOfDay(value ?? new Date()));
	const today = startOfDay(new Date());
	const cells = getMonthGrid(cursor);

	return (
		<div className="w-64">
			<div className="mb-2 flex items-center gap-1">
				<button
					type="button"
					aria-label={labels.calendarPreviousMonth}
					className={navButton()}
					onClick={() =>
						setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
					}
				>
					<CaretLeftIcon size={13} weight="bold" />
				</button>
				<span className="flex-1 text-center text-sm font-semibold">
					{monthFormatter.format(cursor)}
				</span>
				<button
					type="button"
					aria-label={labels.calendarNextMonth}
					className={navButton()}
					onClick={() =>
						setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
					}
				>
					<CaretRightIcon size={13} weight="bold" />
				</button>
			</div>
			<div className="grid grid-cols-7 gap-0.5">
				{WEEKDAY_LABELS.map((label) => (
					<div
						key={label}
						className="pb-1 text-center text-[10px] font-semibold text-graphite dark:text-ginger/70"
					>
						{label}
					</div>
				))}
				{cells.map((cell) => (
					<button
						type="button"
						key={cell.date.toISOString()}
						className={day({
							muted: !cell.inMonth,
							today: sameDay(cell.date, today),
							selected: value !== null && sameDay(cell.date, value),
						})}
						onClick={() => onSelect(cell.date)}
					>
						{cell.date.getDate()}
					</button>
				))}
			</div>
			<div className="mt-3 flex flex-wrap gap-1.5 border-t border-dark-grey/10 pt-3 dark:border-ginger/10">
				<button
					type="button"
					className={quick()}
					onClick={() => onSelect(today)}
				>
					{labels.calendarToday}
				</button>
				<button
					type="button"
					className={quick()}
					onClick={() => onSelect(addDays(today, 1))}
				>
					{labels.calendarTomorrow}
				</button>
				<button
					type="button"
					className={quick()}
					onClick={() => onSelect(addDays(today, 7))}
				>
					{labels.calendarNextWeek}
				</button>
				{onClear && value !== null && (
					<button
						type="button"
						className={quick({ variant: "clear" })}
						onClick={onClear}
					>
						{labels.calendarClear}
					</button>
				)}
			</div>
		</div>
	);
}
