import { describe, expect, it } from "vitest";
import { matchSlashTrigger } from "./trigger.ts";

describe("matchSlashTrigger", () => {
	it("matches a bare trigger and a query after it", () => {
		expect(matchSlashTrigger("/")).toEqual({ query: "", index: 0 });
		expect(matchSlashTrigger("Buy milk /")).toEqual({ query: "", index: 9 });
		expect(matchSlashTrigger("Buy milk /ta")).toEqual({
			query: "ta",
			index: 9,
		});
	});

	it("needs the trigger at the start or after whitespace", () => {
		expect(matchSlashTrigger("a/b")).toBeNull();
		expect(matchSlashTrigger("http://x")).toBeNull();
	});

	it("stops at a space after the trigger", () => {
		expect(matchSlashTrigger("/due tomorrow")).toBeNull();
		expect(matchSlashTrigger("no trigger")).toBeNull();
	});

	it("takes another trigger character", () => {
		expect(matchSlashTrigger("hi @an", "@")).toEqual({ query: "an", index: 3 });
	});
});
