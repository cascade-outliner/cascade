import { describe, expect, it } from "vitest";
import { nextRecurringDueDate, type RecurrenceRule } from "./recurrence";

describe("nextRecurringDueDate", () => {
	it("steps forward by whole days", () => {
		const rule: RecurrenceRule = { unit: "day", interval: 1, anchorDay: 1 };
		expect(nextRecurringDueDate("2026-07-01", rule, "2026-07-01")).toBe(
			"2026-07-02",
		);
	});

	it("steps forward by an interval of days, skipping past today", () => {
		const rule: RecurrenceRule = { unit: "day", interval: 3, anchorDay: 1 };
		// Due date is far in the past; the next occurrence must still land
		// strictly after "today", not just one interval past the due date.
		expect(nextRecurringDueDate("2026-07-01", rule, "2026-07-10")).toBe(
			"2026-07-13",
		);
	});

	it("steps forward by whole weeks", () => {
		const rule: RecurrenceRule = { unit: "week", interval: 1, anchorDay: 1 };
		expect(nextRecurringDueDate("2026-07-01", rule, "2026-07-01")).toBe(
			"2026-07-08",
		);
	});

	it("steps forward by an interval of weeks", () => {
		const rule: RecurrenceRule = { unit: "week", interval: 2, anchorDay: 1 };
		expect(nextRecurringDueDate("2026-07-01", rule, "2026-07-01")).toBe(
			"2026-07-15",
		);
	});

	it("steps forward by whole months, keeping the anchor day", () => {
		const rule: RecurrenceRule = { unit: "month", interval: 1, anchorDay: 15 };
		expect(nextRecurringDueDate("2026-07-15", rule, "2026-07-15")).toBe(
			"2026-08-15",
		);
	});

	it("clamps the anchor day to the shorter month's last day", () => {
		const rule: RecurrenceRule = { unit: "month", interval: 1, anchorDay: 31 };
		// January 31 -> February has no 31st, so it clamps to the 28th (2026 is
		// not a leap year).
		expect(nextRecurringDueDate("2026-01-31", rule, "2026-01-31")).toBe(
			"2026-02-28",
		);
	});

	it("skips multiple months when today is far past the due date", () => {
		const rule: RecurrenceRule = { unit: "month", interval: 1, anchorDay: 1 };
		expect(nextRecurringDueDate("2026-01-01", rule, "2026-06-15")).toBe(
			"2026-07-01",
		);
	});

	it("always advances at least one occurrence past today", () => {
		const rule: RecurrenceRule = { unit: "day", interval: 1, anchorDay: 1 };
		// today is already past the due date by a lot; next must be > today.
		const next = nextRecurringDueDate("2020-01-01", rule, "2026-07-01");
		expect(next > "2026-07-01").toBe(true);
	});
});
