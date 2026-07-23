import type { CalendarDateString } from "@cascade/outliner/calendar-date";
import type { CalendarNodeProps } from "@cascade/outliner/calendar-node";
import { client } from "@/orpc/client";

/** Wires `CalendarNode`'s data-loading props to the real `calendar.*` oRPC
 * procedures. Each level only ever loads once per row (cached in
 * `CalendarNode`'s own state), so these are plain one-off calls rather than
 * `useQuery`s. */
export const calendarNodeData: Pick<
	CalendarNodeProps,
	"loadYears" | "loadMonths" | "loadDays" | "loadDayNodes"
> = {
	loadYears: () => client.calendar.years(),
	loadMonths: (year: number) => client.calendar.months({ year }),
	loadDays: (year: number, month: number) =>
		client.calendar.days({ year, month }),
	loadDayNodes: (date: CalendarDateString) =>
		client.calendar.dayNodes({ date }),
};
