import { formatExport } from "@cascade/outliner/export-format";
import { describe, expect, it } from "vitest";

describe("formatExport", () => {
	describe("markdown", () => {
		it("renders a flat list of roots as top-level bullets", () => {
			const result = formatExport(
				[
					{ depth: 0, text: "First" },
					{ depth: 0, text: "Second" },
				],
				"markdown",
			);
			expect(result).toBe("- First\n- Second");
		});

		it("indents descendants two spaces per depth level", () => {
			const result = formatExport(
				[
					{ depth: 0, text: "Parent" },
					{ depth: 1, text: "Child" },
					{ depth: 2, text: "Grandchild" },
				],
				"markdown",
			);
			expect(result).toBe("- Parent\n  - Child\n    - Grandchild");
		});

		it("returns an empty string for no rows", () => {
			expect(formatExport([], "markdown")).toBe("");
		});
	});

	describe("opml", () => {
		it("wraps a single root in the standard OPML envelope", () => {
			const result = formatExport([{ depth: 0, text: "Only node" }], "opml");
			expect(result).toBe(
				'<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head><title>Cascade export</title></head><body><outline text="Only node" /></body></opml>',
			);
		});

		it("nests children inside their parent's outline element", () => {
			const result = formatExport(
				[
					{ depth: 0, text: "Parent" },
					{ depth: 1, text: "Child" },
				],
				"opml",
			);
			expect(result).toContain(
				'<outline text="Parent"><outline text="Child" /></outline>',
			);
		});

		it("keeps multiple depth-0 rows as separate top-level outlines", () => {
			const result = formatExport(
				[
					{ depth: 0, text: "First root" },
					{ depth: 0, text: "Second root" },
				],
				"opml",
			);
			expect(result).toContain(
				'<outline text="First root" /><outline text="Second root" />',
			);
		});

		it("escapes XML-significant characters in node text", () => {
			const result = formatExport(
				[{ depth: 0, text: `Tom & "Jerry" <3 > 2` }],
				"opml",
			);
			expect(result).toContain(
				'text="Tom &amp; &quot;Jerry&quot; &lt;3 &gt; 2"',
			);
		});

		it("restores sibling nesting correctly after returning to a shallower depth", () => {
			const result = formatExport(
				[
					{ depth: 0, text: "A" },
					{ depth: 1, text: "A.1" },
					{ depth: 0, text: "B" },
					{ depth: 1, text: "B.1" },
				],
				"opml",
			);
			expect(result).toContain(
				'<outline text="A"><outline text="A.1" /></outline><outline text="B"><outline text="B.1" /></outline>',
			);
		});
	});
});
