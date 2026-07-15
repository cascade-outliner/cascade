export type DueBucket = "overdue" | "today" | "upcoming" | "completed";

export function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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

/** The `[start, end)` instant range covering "today" in the local timezone. */
export function todayRange(): { start: Date; end: Date } {
	const start = startOfDay(new Date());
	return { start, end: new Date(start.getTime() + 86_400_000) };
}
