import {
	extractPastedUrl,
	tidyLinkLabel,
} from "@cascade/outliner/lexical-link-paste-utils";
import { describe, expect, it } from "vitest";

describe("extractPastedUrl", () => {
	it("returns the url for a lone https link", () => {
		expect(extractPastedUrl("https://example.com/some/path?query=1")).toBe(
			"https://example.com/some/path?query=1",
		);
	});

	it("returns the url for a lone http link", () => {
		expect(extractPastedUrl("http://example.com")).toBe("http://example.com");
	});

	it("trims surrounding whitespace", () => {
		expect(extractPastedUrl("  https://example.com  \n")).toBe(
			"https://example.com",
		);
	});

	it("returns null for prose containing a url", () => {
		expect(
			extractPastedUrl("check this out https://example.com please"),
		).toBeNull();
	});

	it("returns null for plain text", () => {
		expect(extractPastedUrl("not a url")).toBeNull();
	});

	it("returns null for an empty/whitespace-only paste", () => {
		expect(extractPastedUrl("   ")).toBeNull();
	});

	it("returns null for unsupported protocols", () => {
		expect(extractPastedUrl("javascript:alert(1)")).toBeNull();
		expect(extractPastedUrl("mailto:someone@example.com")).toBeNull();
		expect(extractPastedUrl("ftp://example.com/file")).toBeNull();
	});

	it("returns null for a bare domain without a protocol", () => {
		expect(extractPastedUrl("example.com")).toBeNull();
	});
});

describe("tidyLinkLabel", () => {
	it("uses the bare hostname for a root url", () => {
		expect(tidyLinkLabel("https://example.com")).toBe("example.com");
		expect(tidyLinkLabel("https://example.com/")).toBe("example.com");
	});

	it("strips a leading www.", () => {
		expect(tidyLinkLabel("https://www.example.com")).toBe("example.com");
	});

	it("keeps a short path alongside the hostname", () => {
		expect(tidyLinkLabel("https://example.com/docs")).toBe("example.com/docs");
	});

	it("includes the query string", () => {
		expect(tidyLinkLabel("https://example.com/search?q=cascade")).toBe(
			"example.com/search?q=cascade",
		);
	});

	it("ellipsizes labels longer than maxLength", () => {
		const url = `https://example.com/${"a".repeat(100)}`;
		const label = tidyLinkLabel(url, 20);
		expect(label).toHaveLength(20);
		expect(label.endsWith("…")).toBe(true);
	});

	it("falls back to the raw string when the url can't be parsed", () => {
		expect(tidyLinkLabel("not-a-real-url")).toBe("not-a-real-url");
	});
});
