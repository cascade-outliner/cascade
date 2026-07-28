import { afterEach, describe, expect, it } from "vitest";
import { isRowMotionEnabled } from "./row-motion-flag";

describe("isRowMotionEnabled", () => {
	afterEach(() => {
		Reflect.deleteProperty(globalThis, "window");
	});

	it("is false outside a browser (no `window`, e.g. SSR/node tests)", () => {
		expect(isRowMotionEnabled()).toBe(false);
	});

	it("is false by default with a `window` present", () => {
		Object.defineProperty(globalThis, "window", {
			value: {},
			configurable: true,
		});
		expect(isRowMotionEnabled()).toBe(false);
	});

	it("is true once the perf harness sets the flag", () => {
		Object.defineProperty(globalThis, "window", {
			value: { __CASCADE_ROW_MOTION__: true },
			configurable: true,
		});
		expect(isRowMotionEnabled()).toBe(true);
	});
});
