import { describe, expect, it } from "vitest";
import { plainText, textState } from "./content.ts";

/** The nodes of the first paragraph. */
function paragraphOf(text: string): { type: string; text?: string }[] {
	const paragraph = textState(text).root.children[0] as unknown as {
		children: { type: string; text?: string }[];
	};
	return paragraph.children;
}

describe("textState", () => {
	it("holds one line as a single text node", () => {
		expect(paragraphOf("Buy milk")).toEqual([
			expect.objectContaining({ type: "text", text: "Buy milk" }),
		]);
	});

	it("turns newlines into line breaks between text nodes", () => {
		expect(paragraphOf("one\ntwo\nthree").map((node) => node.type)).toEqual([
			"text",
			"linebreak",
			"text",
			"linebreak",
			"text",
		]);
	});
});

describe("plainText", () => {
	it("round-trips text with newlines", () => {
		for (const text of ["", "Buy milk", "one\ntwo", "a\n\nb"]) {
			expect(plainText(textState(text))).toBe(text);
		}
	});
});
