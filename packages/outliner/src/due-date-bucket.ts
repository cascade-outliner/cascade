export type DueBucket = "overdue" | "today" | "upcoming" | "completed";

export function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday 00:00 local time of the week containing `date`. */
export function startOfWeek(date: Date): Date {
	const start = startOfDay(date);
	start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
	return start;
}

function diffDaysFromToday(date: Date): number {
	return Math.round(
		(startOfDay(date).getTime() - startOfDay(new Date()).getTime()) /
			86_400_000,
	);
}

/** Whether `dueDate` falls today, independent of completion status. */
export function isDueToday(dueDate: Date): boolean {
	return diffDaysFromToday(dueDate) === 0;
}

/** Whether `dueDate` falls in the current week, independent of completion status. */
export function isDueThisWeek(dueDate: Date): boolean {
	const weekStart = startOfWeek(new Date());
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 7);
	const due = startOfDay(dueDate);
	return due >= weekStart && due < weekEnd;
}

/** Whether `dueDate` falls on `selected`, independent of completion status. */
export function isDueOnDate(dueDate: Date, selected: Date): boolean {
	return startOfDay(dueDate).getTime() === startOfDay(selected).getTime();
}

export function dueBucket(dueDate: Date, completed: boolean): DueBucket {
	if (completed) return "completed";
	const diffDays = diffDaysFromToday(dueDate);
	if (diffDays < 0) return "overdue";
	if (diffDays === 0) return "today";
	return "upcoming";
}
