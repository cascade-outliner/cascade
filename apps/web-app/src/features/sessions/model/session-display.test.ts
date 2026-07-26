import { describe, expect, it } from "vitest";
import {
	formatSessionActivity,
	parseSessionDevice,
} from "@/features/sessions/model/session-display";

describe("parseSessionDevice", () => {
	it("parses desktop browser and operating system", () => {
		expect(
			parseSessionDevice(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
					"AppleWebKit/537.36 (KHTML, like Gecko) " +
					"Chrome/126.0.0.0 Safari/537.36",
			),
		).toMatchObject({
			browser: "Chrome",
			os: "macOS",
			type: "desktop",
		});
	});

	it("parses a mobile browser", () => {
		expect(
			parseSessionDevice(
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) " +
					"AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1",
			),
		).toMatchObject({
			browser: "Safari",
			os: "iOS",
			type: "mobile",
		});
	});

	it("returns a safe fallback when user-agent data is absent", () => {
		expect(parseSessionDevice(null)).toEqual({
			browser: null,
			os: null,
			type: "unknown",
		});
	});
});

describe("formatSessionActivity", () => {
	const now = new Date("2026-07-25T12:00:00Z");

	it("uses coarse localized day labels", () => {
		expect(
			formatSessionActivity(new Date("2026-07-25T01:00:00Z"), "en", now),
		).toBe("today");
		expect(
			formatSessionActivity(new Date("2026-07-24T11:59:59Z"), "en", now),
		).toBe("yesterday");
		expect(
			formatSessionActivity(new Date("2026-07-22T12:00:00Z"), "nl", now),
		).toBe("3 dagen geleden");
	});

	it("treats future timestamps as active today", () => {
		expect(
			formatSessionActivity(new Date("2026-07-26T12:00:00Z"), "en", now),
		).toBe("today");
	});
});
