import { describe, expect, it } from "vitest";
import {
	MAX_INDENT_SIZE,
	MIN_INDENT_SIZE,
	settingsPatchSchema,
} from "@/core/settings/settings-patch-schema";

describe("settingsPatchSchema", () => {
	it("accepts an empty patch", () => {
		expect(settingsPatchSchema.parse({})).toEqual({});
	});

	it("accepts a partial patch with a single key", () => {
		expect(settingsPatchSchema.parse({ dark: true })).toEqual({ dark: true });
	});

	it("accepts a full settings object", () => {
		const full = {
			dark: false,
			indentSize: 24,
			lastSeenChangelogId: "2026-07-17",
			preAlphaBannerDismissed: true,
		};
		expect(settingsPatchSchema.parse(full)).toEqual(full);
	});

	it("accepts a null lastSeenChangelogId", () => {
		expect(settingsPatchSchema.parse({ lastSeenChangelogId: null })).toEqual({
			lastSeenChangelogId: null,
		});
	});

	it("strips unknown keys", () => {
		expect(settingsPatchSchema.parse({ dark: true, evil: "x" })).toEqual({
			dark: true,
		});
	});

	it("rejects an indent size below the minimum", () => {
		expect(
			settingsPatchSchema.safeParse({ indentSize: MIN_INDENT_SIZE - 1 })
				.success,
		).toBe(false);
	});

	it("rejects an indent size above the maximum", () => {
		expect(
			settingsPatchSchema.safeParse({ indentSize: MAX_INDENT_SIZE + 1 })
				.success,
		).toBe(false);
	});

	it("rejects a fractional indent size", () => {
		expect(settingsPatchSchema.safeParse({ indentSize: 16.5 }).success).toBe(
			false,
		);
	});

	it("rejects wrong value types", () => {
		expect(settingsPatchSchema.safeParse({ dark: "yes" }).success).toBe(false);
		expect(
			settingsPatchSchema.safeParse({ lastSeenChangelogId: 5 }).success,
		).toBe(false);
	});
});
