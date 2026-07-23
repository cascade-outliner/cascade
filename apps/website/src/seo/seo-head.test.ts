import { describe, expect, it } from "vitest";
import { seoHead } from "./seo-head";

describe("seoHead", () => {
	it("builds metadata for the home page", () => {
		const head = seoHead("Home", "Home description");

		expect(head.links).toEqual([
			{ rel: "canonical", href: "https://cascadelist.com" },
		]);
		expect(head.meta).toContainEqual({
			property: "og:url",
			content: "https://cascadelist.com",
		});
		expect(head.meta).toContainEqual({
			name: "twitter:image",
			content: "https://cascadelist.com/og-image.png",
		});
	});

	it("appends a route path to absolute URLs", () => {
		const head = seoHead("Privacy", "Privacy description", "/privacy");

		expect(head.links).toEqual([
			{
				rel: "canonical",
				href: "https://cascadelist.com/privacy",
			},
		]);
		expect(head.meta).toContainEqual({
			property: "og:url",
			content: "https://cascadelist.com/privacy",
		});
	});
});
