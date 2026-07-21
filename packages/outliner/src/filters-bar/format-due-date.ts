const dueOnDateFormatter = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	month: "short",
});
const dueOnDateWithYearFormatter = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	month: "short",
	year: "numeric",
});

export function formatDueOnDate(date: Date): string {
	return date.getFullYear() === new Date().getFullYear()
		? dueOnDateFormatter.format(date)
		: dueOnDateWithYearFormatter.format(date);
}

export function formatDueDateRange(start: Date, end: Date): string {
	const currentYear = new Date().getFullYear();
	const sameYear = start.getFullYear() === end.getFullYear();
	// Only show the year on the end date if both are in the same non-current year,
	// or if they span across years.
	const startStr =
		start.getFullYear() === currentYear
			? dueOnDateFormatter.format(start)
			: dueOnDateWithYearFormatter.format(start);
	const endInCurrentYear = end.getFullYear() === currentYear;
	const startAndEndSameYear = sameYear && start.getFullYear() === currentYear;
	const endStr =
		endInCurrentYear || startAndEndSameYear
			? dueOnDateFormatter.format(end)
			: dueOnDateWithYearFormatter.format(end);
	return `${startStr}–${endStr}`;
}
