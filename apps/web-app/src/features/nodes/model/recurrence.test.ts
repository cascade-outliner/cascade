import {
	nextRecurringDueDate,
	type RecurrenceRule,
} from "@cascade/outliner/recurrence";
import { describe, expect, it } from "vitest";

const rule = (
	unit: RecurrenceRule["unit"],
	interval = 1,
	anchorDay = 1,
): RecurrenceRule => ({ unit, interval, anchorDay });

describe("nextRecurringDueDate", () => {
	it("advances at least once when completed early", () => {
		expect(nextRecurringDueDate("2026-08-01", rule("week"), "2026-07-27")).toBe(
			"2026-08-08",
		);
	});

	it("catches overdue schedules up to the first future occurrence", () => {
		expect(nextRecurringDueDate("2026-07-20", rule("day"), "2026-07-27")).toBe(
			"2026-07-28",
		);
		expect(
			nextRecurringDueDate("2026-07-01", rule("week", 2), "2026-07-27"),
		).toBe("2026-07-29");
	});

	it("preserves the monthly anchor across short months", () => {
		expect(
			nextRecurringDueDate("2026-01-31", rule("month", 1, 31), "2026-01-31"),
		).toBe("2026-02-28");
		expect(
			nextRecurringDueDate("2026-02-28", rule("month", 1, 31), "2026-02-28"),
		).toBe("2026-03-31");
		expect(
			nextRecurringDueDate("2026-01-31", rule("month", 1, 31), "2026-02-01"),
		).toBe("2026-02-28");
	});
});
