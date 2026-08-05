import { describe, expect, it } from "vitest";
import { combineDueDateTime, isValidCalendarTimeString } from "./calendar-time";

describe("isValidCalendarTimeString", () => {
	it("accepts zero-padded 24h times", () => {
		expect(isValidCalendarTimeString("00:00")).toBe(true);
		expect(isValidCalendarTimeString("09:30")).toBe(true);
		expect(isValidCalendarTimeString("23:59")).toBe(true);
	});

	it("rejects malformed or out-of-range times", () => {
		expect(isValidCalendarTimeString("24:00")).toBe(false);
		expect(isValidCalendarTimeString("9:30")).toBe(false);
		expect(isValidCalendarTimeString("09:60")).toBe(false);
		expect(isValidCalendarTimeString("")).toBe(false);
		expect(isValidCalendarTimeString("not-a-time")).toBe(false);
	});
});

describe("combineDueDateTime", () => {
	it("combines a calendar date and time into the matching local instant", () => {
		const combined = combineDueDateTime("2026-07-31", "14:05");
		expect(combined.getFullYear()).toBe(2026);
		expect(combined.getMonth()).toBe(6);
		expect(combined.getDate()).toBe(31);
		expect(combined.getHours()).toBe(14);
		expect(combined.getMinutes()).toBe(5);
		expect(combined.getSeconds()).toBe(0);
	});
});
