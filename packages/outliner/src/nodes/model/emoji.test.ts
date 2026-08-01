import { describe, expect, it } from "vitest";
import { isSingleEmoji } from "./emoji";

describe("isSingleEmoji", () => {
	it("accepts a single simple emoji", () => {
		expect(isSingleEmoji("📌")).toBe(true);
	});

	it("accepts a single multi-codepoint emoji (ZWJ sequence, variation selector)", () => {
		expect(isSingleEmoji("❤️")).toBe(true);
		expect(isSingleEmoji("👨‍👩‍👧‍👦")).toBe(true);
	});

	it("accepts surrounding whitespace", () => {
		expect(isSingleEmoji("  🔥  ")).toBe(true);
	});

	it("rejects an empty or whitespace-only string", () => {
		expect(isSingleEmoji("")).toBe(false);
		expect(isSingleEmoji("   ")).toBe(false);
	});

	it("rejects plain text", () => {
		expect(isSingleEmoji("hello")).toBe(false);
		expect(isSingleEmoji("a")).toBe(false);
	});

	it("rejects more than one emoji", () => {
		expect(isSingleEmoji("📌🔥")).toBe(false);
	});
});
