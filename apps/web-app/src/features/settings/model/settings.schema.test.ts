import { fontSizeIds } from "@cascade/theme/font-sizes";
import { fontIds } from "@cascade/theme/fonts";
import {
	darkThemeIds,
	lightThemeIds,
	themeSelectionIds,
} from "@cascade/theme/themes";
import { describe, expect, it } from "vitest";
import {
	MAX_INDENT_SIZE,
	MIN_INDENT_SIZE,
	settingsPatchSchema,
} from "@/features/settings/model/settings.schema";

describe("settingsPatchSchema", () => {
	it("accepts an empty patch", () => {
		expect(settingsPatchSchema.parse({})).toEqual({});
	});

	it("accepts a partial patch with a single key", () => {
		expect(settingsPatchSchema.parse({ theme: "dracula" })).toEqual({
			theme: "dracula",
		});
	});

	it("accepts a full settings object", () => {
		const full = {
			theme: "catppuccin-mocha",
			lightTheme: "catppuccin-latte",
			darkTheme: "dracula",
			font: "system-mono",
			fontSize: "large",
			indentSize: 24,
			preAlphaBannerDismissed: true,
		};
		expect(settingsPatchSchema.parse(full)).toEqual(full);
	});

	it("accepts every registered theme selection (including 'system') and font", () => {
		for (const theme of themeSelectionIds) {
			expect(settingsPatchSchema.parse({ theme })).toEqual({ theme });
		}
		for (const font of fontIds) {
			expect(settingsPatchSchema.parse({ font })).toEqual({ font });
		}
		for (const fontSize of fontSizeIds) {
			expect(settingsPatchSchema.parse({ fontSize })).toEqual({ fontSize });
		}
	});

	it("rejects an unknown theme", () => {
		expect(
			settingsPatchSchema.safeParse({ theme: "hotdog-stand" }).success,
		).toBe(false);
	});

	it("rejects an unknown font", () => {
		expect(settingsPatchSchema.safeParse({ font: "comic-sans" }).success).toBe(
			false,
		);
	});

	it("rejects an unknown font size", () => {
		expect(settingsPatchSchema.safeParse({ fontSize: "huge" }).success).toBe(
			false,
		);
	});

	it("accepts every light theme as lightTheme and every dark theme as darkTheme", () => {
		for (const theme of lightThemeIds) {
			expect(settingsPatchSchema.parse({ lightTheme: theme })).toEqual({
				lightTheme: theme,
			});
		}
		for (const theme of darkThemeIds) {
			expect(settingsPatchSchema.parse({ darkTheme: theme })).toEqual({
				darkTheme: theme,
			});
		}
	});

	it("rejects a dark theme assigned to lightTheme", () => {
		expect(
			settingsPatchSchema.safeParse({ lightTheme: darkThemeIds[0] }).success,
		).toBe(false);
	});

	it("rejects a light theme assigned to darkTheme", () => {
		expect(
			settingsPatchSchema.safeParse({ darkTheme: lightThemeIds[0] }).success,
		).toBe(false);
	});

	it("strips unknown keys", () => {
		expect(settingsPatchSchema.parse({ theme: "dracula", evil: "x" })).toEqual({
			theme: "dracula",
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
		expect(
			settingsPatchSchema.safeParse({ preAlphaBannerDismissed: "yes" }).success,
		).toBe(false);
	});
});
