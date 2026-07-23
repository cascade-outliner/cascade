import { readFileSync } from "node:fs";
import { fontSizeAttribute, fontSizes } from "@cascade/theme/font-sizes";
import { fontAttribute, fonts } from "@cascade/theme/fonts";
import {
	darkThemeIds,
	lightThemeIds,
	resolveThemeId,
	SYSTEM_THEME,
	themeAttribute,
	themes,
} from "@cascade/theme/themes";
import { describe, expect, it } from "vitest";

const themeCss = readFileSync(
	new URL("../../../../../../packages/theme/theme.css", import.meta.url),
	"utf8",
);
const manifest = JSON.parse(
	readFileSync(
		new URL("../../../../public/manifest.json", import.meta.url),
		"utf8",
	),
);

describe("theme registry", () => {
	it("has a CSS palette block for every non-built-in theme", () => {
		for (const theme of themes) {
			const attribute = themeAttribute(theme.id);
			if (attribute === undefined) continue;
			expect(themeCss).toContain(`[data-theme="${attribute}"]`);
		}
	});

	it("overrides all six palette slots in every theme block", () => {
		const slots = [
			"--color-canvas",
			"--color-surface",
			"--color-danger",
			"--color-muted",
			"--color-accent",
			"--color-ink",
		];
		const blocks = themeCss.matchAll(/\[data-theme="[^"]+"\]\s*\{([^}]*)\}/g);
		for (const [, body] of blocks) {
			for (const slot of slots) {
				expect(body).toContain(`${slot}:`);
			}
		}
	});

	it("has a CSS font block for every non-default font", () => {
		for (const font of fonts) {
			const attribute = fontAttribute(font.id);
			if (attribute === undefined) continue;
			expect(themeCss).toContain(`[data-font="${attribute}"]`);
		}
	});

	it("has a CSS font-size block for every non-default font size", () => {
		for (const fontSize of fontSizes) {
			const attribute = fontSizeAttribute(fontSize.id);
			if (attribute === undefined) continue;
			expect(themeCss).toContain(`[data-font-size="${attribute}"]`);
		}
	});

	it("uses unique theme, font, and font size ids", () => {
		expect(new Set(themes.map((theme) => theme.id)).size).toBe(themes.length);
		expect(new Set(fonts.map((font) => font.id)).size).toBe(fonts.length);
		expect(new Set(fontSizes.map((fontSize) => fontSize.id)).size).toBe(
			fontSizes.length,
		);
	});

	it("lets the browser pick default manifest colors", () => {
		expect(manifest).not.toHaveProperty("theme_color");
		expect(manifest).not.toHaveProperty("background_color");
	});

	it("partitions every theme into exactly light or dark", () => {
		expect(lightThemeIds.length + darkThemeIds.length).toBe(themes.length);
		for (const id of lightThemeIds) {
			expect(darkThemeIds).not.toContain(id);
		}
	});
});

describe("resolveThemeId", () => {
	it("passes a fixed selection through unchanged, regardless of OS preference", () => {
		expect(resolveThemeId("nord", "light", "dark", false)).toBe("nord");
		expect(resolveThemeId("nord", "light", "dark", true)).toBe("nord");
	});

	it("resolves 'system' to the configured light theme when the OS prefers light", () => {
		expect(
			resolveThemeId(SYSTEM_THEME, "catppuccin-latte", "dracula", false),
		).toBe("catppuccin-latte");
	});

	it("resolves 'system' to the configured dark theme when the OS prefers dark", () => {
		expect(
			resolveThemeId(SYSTEM_THEME, "catppuccin-latte", "dracula", true),
		).toBe("dracula");
	});
});
