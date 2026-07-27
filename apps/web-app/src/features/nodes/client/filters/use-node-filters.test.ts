import { describe, expect, it } from "vitest";
import {
	completedFilterOverride,
	resolveHideCompleted,
} from "./use-node-filters";

describe("completed task filter preference", () => {
	it("uses the account default when the URL has no override", () => {
		expect(resolveHideCompleted(null, false)).toBe(false);
		expect(resolveHideCompleted(null, true)).toBe(true);
	});

	it("lets the URL override either account default", () => {
		expect(resolveHideCompleted("hidden", false)).toBe(true);
		expect(resolveHideCompleted("visible", true)).toBe(false);
	});

	it("only writes a URL value when the view differs from the account default", () => {
		expect(completedFilterOverride(false, false)).toBeNull();
		expect(completedFilterOverride(true, true)).toBeNull();
		expect(completedFilterOverride(true, false)).toBe("hidden");
		expect(completedFilterOverride(false, true)).toBe("visible");
	});
});
