import { readFileSync } from "node:fs";
import { fontAttribute, fonts } from "@cascade/theme/fonts";
import { themeAttribute, themes } from "@cascade/theme/themes";
import { describe, expect, it } from "vitest";

const themeCss = readFileSync(
	new URL("../../../../../packages/theme/theme.css", import.meta.url),
	"utf8",
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
			"--color-super-ginger",
			"--color-ginger",
			"--color-redleather",
			"--color-graphite",
			"--color-peach",
			"--color-dark-grey",
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

	it("uses unique theme and font ids", () => {
		expect(new Set(themes.map((theme) => theme.id)).size).toBe(themes.length);
		expect(new Set(fonts.map((font) => font.id)).size).toBe(fonts.length);
	});
});
