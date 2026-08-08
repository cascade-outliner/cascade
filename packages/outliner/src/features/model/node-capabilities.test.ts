import { describe, expect, it } from "vitest";
import {
	blockTypeCapability,
	minimalNodeCapabilities,
	resolveNodeCapabilities,
	toggleNodeCapability,
} from "./node-capabilities";

describe("node capabilities", () => {
	it("uses the minimal paragraph, task, and duplicate preset", () => {
		expect(minimalNodeCapabilities).toEqual(["paragraph", "task", "duplicate"]);
	});

	it("keeps search opt-in", () => {
		expect(resolveNodeCapabilities(minimalNodeCapabilities)).not.toContain(
			"search",
		);
	});

	it("enables dependencies with recurrence and status", () => {
		expect(resolveNodeCapabilities(["recurrence", "status"])).toEqual([
			"task",
			"due-date",
			"recurrence",
			"board",
			"status",
			"paragraph",
		]);
	});

	it("always keeps paragraph enabled", () => {
		expect(resolveNodeCapabilities([])).toEqual(["paragraph"]);
		expect(toggleNodeCapability(["paragraph"], "paragraph", false)).toEqual([
			"paragraph",
		]);
	});

	it("disables dependents when a prerequisite is disabled", () => {
		expect(
			toggleNodeCapability(
				["task", "due-date", "recurrence", "board", "status"],
				"task",
				false,
			),
		).toEqual(["due-date", "board", "status"]);
		expect(toggleNodeCapability(["board", "status"], "board", false)).toEqual(
			[],
		);
	});

	it("maps every lexical block type to its conversion capability", () => {
		expect(blockTypeCapability("paragraph")).toBe("paragraph");
		expect(blockTypeCapability("h6")).toBe("heading-6");
	});
});
