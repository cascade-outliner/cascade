import { describe, expect, it } from "vitest";
import { nodeSearchText, normalizeSearchText } from "./node-search-text";
import { quickOpenSnippet } from "./quick-open";

const content = (text: string) => ({
	root: {
		type: "root",
		children: [
			{
				type: "paragraph",
				children: [{ type: "text", text }],
			},
		],
	},
});

describe("Quick Open text", () => {
	it("normalizes case, diacritics, and whitespace for matching", () => {
		expect(normalizeSearchText("  RÉSUMÉ\tNotes  ")).toBe("resume notes");
		expect(nodeSearchText(content("RÉSUMÉ Notes"))).toBe("resume notes");
	});

	it("builds a match-centered snippet and highlights every occurrence", () => {
		const result = quickOpenSnippet(
			content(`${"prefix ".repeat(40)}Résumé and RESUME`),
			"resume",
		);

		expect(result.hasPrefix).toBe(true);
		expect(result.text).toContain("Résumé and RESUME");
		expect(
			result.highlightRanges.map(({ start, end }) =>
				result.text.slice(start, end),
			),
		).toEqual(["Résumé", "RESUME"]);
	});
});
