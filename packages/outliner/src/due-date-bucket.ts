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

export function isDueThisWeek(dueDate: Date, completed: boolean): boolean {
	if (completed) return false;
	const weekStart = startOfWeek(new Date());
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 7);
	const due = startOfDay(dueDate);
	return due >= weekStart && due < weekEnd;
}

export function isDueOnDate(
	dueDate: Date,
	selected: Date,
	completed: boolean,
): boolean {
	if (completed) return false;
	return startOfDay(dueDate).getTime() === startOfDay(selected).getTime();
}

export function dueBucket(dueDate: Date, completed: boolean): DueBucket {
	if (completed) return "completed";
	const diffDays = Math.round(
		(startOfDay(dueDate).getTime() - startOfDay(new Date()).getTime()) /
			86_400_000,
	);
	if (diffDays < 0) return "overdue";
	if (diffDays === 0) return "today";
	return "upcoming";
}
