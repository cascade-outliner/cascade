import {
	isHttpUrl,
	MAX_URL_LENGTH,
	normalizeHttpUrl,
	tidyUrlLabel,
} from "@cascade/outliner/lexical/link-url";
import { describe, expect, it } from "vitest";

describe("isHttpUrl", () => {
	it("accepts http and https URLs", () => {
		expect(isHttpUrl("https://example.com")).toBe(true);
		expect(isHttpUrl("http://example.com/a?b=1#c")).toBe(true);
	});

	it("rejects non-http schemes and plain text", () => {
		expect(isHttpUrl("javascript:alert(1)")).toBe(false);
		expect(isHttpUrl("data:text/html,x")).toBe(false);
		expect(isHttpUrl("ftp://example.com")).toBe(false);
		expect(isHttpUrl("example.com")).toBe(false);
		expect(isHttpUrl("just some words")).toBe(false);
	});

	it("rejects URLs longer than the cap", () => {
		const url = `https://example.com/${"x".repeat(MAX_URL_LENGTH)}`;
		expect(isHttpUrl(url)).toBe(false);
	});
});

describe("normalizeHttpUrl", () => {
	it("passes through valid http(s) URLs", () => {
		expect(normalizeHttpUrl(" https://example.com/a ")).toBe(
			"https://example.com/a",
		);
	});

	it("prepends https:// when no scheme was typed", () => {
		expect(normalizeHttpUrl("example.com/a")).toBe("https://example.com/a");
	});

	it("returns null for other schemes, whitespace, and empty input", () => {
		expect(normalizeHttpUrl("javascript:alert(1)")).toBe(null);
		expect(normalizeHttpUrl("two words")).toBe(null);
		expect(normalizeHttpUrl("   ")).toBe(null);
	});
});

describe("tidyUrlLabel", () => {
	it("strips the scheme and www prefix", () => {
		expect(tidyUrlLabel("https://www.example.com/docs")).toBe(
			"example.com/docs",
		);
	});

	it("drops a bare trailing slash", () => {
		expect(tidyUrlLabel("https://example.com/")).toBe("example.com");
	});

	it("keeps query and hash within the length budget", () => {
		expect(tidyUrlLabel("https://example.com/a?b=1#c")).toBe(
			"example.com/a?b=1#c",
		);
	});

	it("truncates long URLs with an ellipsis", () => {
		const label = tidyUrlLabel(
			"https://example.com/some/very/long/path/segments/that/keep/going?query=1",
		);
		expect(label.endsWith("…")).toBe(true);
		expect(label.length).toBeLessThanOrEqual(40);
		expect(label.startsWith("example.com/")).toBe(true);
	});
});
