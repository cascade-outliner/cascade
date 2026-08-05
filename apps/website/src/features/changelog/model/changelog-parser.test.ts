import { describe, expect, it } from "vitest";
import { parseChangelog } from "./changelog-parser";

describe("parseChangelog", () => {
	it("preserves section and item order", () => {
		const entries = parseChangelog(`# Changelog

## 2026-07-23

- [feat] Added **outlines**
- Plain item

## 2026-07-22

- [fix] Fixed nesting
`);

		expect(entries).toEqual([
			{
				id: "2026-07-23",
				items: [
					{ type: "feat", html: "Added <strong>outlines</strong>" },
					{ type: null, html: "Plain item" },
				],
			},
			{
				id: "2026-07-22",
				items: [{ type: "fix", html: "Fixed nesting" }],
			},
		]);
	});

	it("recognizes the perf type marker", () => {
		const [entry] = parseChangelog("## Next\n- [perf] Sped things up");

		expect(entry.items).toEqual([{ type: "perf", html: "Sped things up" }]);
	});

	it("keeps unknown type markers as content", () => {
		const [entry] = parseChangelog("## Next\n- [docs] Documented behavior");

		expect(entry.items).toEqual([
			{ type: null, html: "[docs] Documented behavior" },
		]);
	});
});
