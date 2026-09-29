import { expect, test } from "vitest";
import { extractTags } from "./tags.ts";

test("extractTags", () => {
	expect(extractTags("a #Work b #work #x_1 c#no ##no #é")).toEqual([
		"work",
		"x_1",
		"é",
	]);
});
