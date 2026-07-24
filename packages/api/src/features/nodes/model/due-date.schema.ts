import { isValidCalendarDateString } from "@cascade/outliner/calendar-date";
import { z } from "zod";

/** A `YYYY-MM-DD` calendar date, as sent by the client's due-date picker. */
export const dueDateSchema = z
	.string()
	.refine(isValidCalendarDateString, { message: "Invalid calendar date" });
