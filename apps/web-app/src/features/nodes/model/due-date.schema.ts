import { isValidCalendarDateString } from "@cascade/outliner/calendar-date";
import { isValidCalendarTimeString } from "@cascade/outliner/calendar-time";
import { z } from "zod";

/** A `YYYY-MM-DD` calendar date, as sent by the client's due-date picker. */
export const dueDateSchema = z
	.string()
	.refine(isValidCalendarDateString, { message: "Invalid calendar date" });

/** An `HH:MM` local time of day, as sent by the client's due-time picker. */
export const dueTimeSchema = z
	.string()
	.refine(isValidCalendarTimeString, { message: "Invalid calendar time" })
	.nullable();

/**
 * The implicit local time a task with a due date but no explicit `dueTime`
 * notifies at, so every due task can still trigger a real-time notification
 * (see #599).
 */
export const DEFAULT_DUE_NOTIFICATION_TIME = "09:00";
