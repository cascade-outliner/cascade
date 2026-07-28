import { afterEach, describe, expect, it, vi } from "vitest";
import {
	acknowledgeMountedRowConversion,
	consumeEntryMotion,
	markRowEntering,
	markRowRestored,
	playRowExit,
	registerRowElement,
	resetRowLifecycleMotion,
} from "./row-lifecycle";

afterEach(() => {
	resetRowLifecycleMotion();
});

describe("entry motion markers", () => {
	it("marks and consumes a created row's enter motion exactly once", () => {
		markRowEntering("row-1");

		expect(consumeEntryMotion("row-1")).toBe("enter");
		expect(consumeEntryMotion("row-1")).toBeUndefined();
	});

	it("marks and consumes a restored row's flash motion", () => {
		markRowRestored("row-2");

		expect(consumeEntryMotion("row-2")).toBe("flash");
	});

	it("has nothing pending for a row nothing marked", () => {
		expect(consumeEntryMotion("row-3")).toBeUndefined();
	});
});

describe("playRowExit", () => {
	it("resolves immediately when the row isn't currently mounted", async () => {
		await expect(playRowExit("off-screen-row")).resolves.toBeUndefined();
	});

	it("animates the mounted row and awaits its finish before resolving", async () => {
		let resolveFinished: () => void = () => {};
		const finished = new Promise<void>((resolve) => {
			resolveFinished = resolve;
		});
		const element = { animate: vi.fn(() => ({ finished })) };
		registerRowElement("row-4", element as unknown as HTMLElement);

		let settled = false;
		const promise = playRowExit("row-4").then(() => {
			settled = true;
		});
		await Promise.resolve();
		expect(settled).toBe(false);

		resolveFinished();
		await promise;

		expect(settled).toBe(true);
		expect(element.animate).toHaveBeenCalled();
	});

	it("unregistering an element (e.g. on unmount) makes a later exit a no-op", async () => {
		const element = { animate: vi.fn(() => ({ finished: Promise.resolve() })) };
		registerRowElement("row-5", element as unknown as HTMLElement);
		registerRowElement("row-5", null);

		await playRowExit("row-5");

		expect(element.animate).not.toHaveBeenCalled();
	});
});

describe("acknowledgeMountedRowConversion", () => {
	it("outlines the mounted row exactly once per success signal", () => {
		const element = {
			animate: vi.fn(() => ({ finished: Promise.resolve() })),
		};
		registerRowElement("row-6", element as unknown as HTMLElement);

		acknowledgeMountedRowConversion("row-6");

		expect(element.animate).toHaveBeenCalledOnce();
		expect(element.animate).toHaveBeenCalledWith(
			[
				{
					boxShadow:
						"inset 0 0 0 2px color-mix(in srgb, var(--color-accent) 65%, transparent)",
				},
				{ boxShadow: "inset 0 0 0 2px transparent" },
			],
			expect.any(Object),
		);
	});

	it("does nothing when the converted row is virtualized out of view", () => {
		expect(() =>
			acknowledgeMountedRowConversion("off-screen-row"),
		).not.toThrow();
	});
});
