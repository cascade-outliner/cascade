import { describe, expect, it } from "vitest";
import {
	canStepBack,
	canStepForward,
	emptyNavigationHistory,
	MAX_HISTORY_ENTRIES,
	type NavigationHistoryState,
	nextLocation,
	pathnameToVisitedLocation,
	previousLocation,
	type VisitedLocation,
	visit,
} from "./navigation-history";

const visitAll = (...locations: VisitedLocation[]) =>
	locations.reduce(visit, emptyNavigationHistory);

const at = (state: NavigationHistoryState) => state.entries[state.index];

describe("pathnameToVisitedLocation", () => {
	it("reads the root outline as the null location", () => {
		expect(pathnameToVisitedLocation("/")).toBeNull();
		expect(pathnameToVisitedLocation("")).toBeNull();
	});

	it("reads a node slug out of the pathname", () => {
		expect(pathnameToVisitedLocation("/my-node-1111aaaa")).toBe(
			"my-node-1111aaaa",
		);
	});

	it("decodes an escaped slug so it matches the param form", () => {
		expect(pathnameToVisitedLocation("/caf%C3%A9-1111aaaa")).toBe(
			"café-1111aaaa",
		);
	});

	it("keeps a malformed escape as its own distinct location", () => {
		expect(pathnameToVisitedLocation("/%E0%A4%A")).toBe("%E0%A4%A");
	});
});

describe("visit", () => {
	it("pushes each newly visited node onto the stack", () => {
		const state = visitAll(null, "a-1111aaaa", "b-2222bbbb");

		expect(state.entries).toEqual([null, "a-1111aaaa", "b-2222bbbb"]);
		expect(state.index).toBe(2);
	});

	it("ignores a repeat visit to the node already displayed", () => {
		const state = visitAll(null, "a-1111aaaa");

		expect(visit(state, "a-1111aaaa")).toBe(state);
	});

	it("moves the cursor back instead of pushing when landing on the previous entry", () => {
		const state = visit(visitAll(null, "a-1111aaaa"), null);

		expect(state.entries).toEqual([null, "a-1111aaaa"]);
		expect(state.index).toBe(0);
	});

	it("moves the cursor forward instead of pushing when landing on the next entry", () => {
		const back = visit(visitAll(null, "a-1111aaaa"), null);
		const state = visit(back, "a-1111aaaa");

		expect(state.entries).toEqual([null, "a-1111aaaa"]);
		expect(state.index).toBe(1);
	});

	it("drops the forward entries when navigating somewhere new after stepping back", () => {
		const back = visit(
			visitAll(null, "a-1111aaaa", "b-2222bbbb"),
			"a-1111aaaa",
		);
		const state = visit(back, "c-3333cccc");

		expect(state.entries).toEqual([null, "a-1111aaaa", "c-3333cccc"]);
		expect(state.index).toBe(2);
	});

	it("treats a slug that changed with the node's title as a new entry that still points at the node", () => {
		const state = visitAll(
			"old-title-1111aaaa",
			"b-2222bbbb",
			"new-title-1111aaaa",
		);

		expect(state.entries).toEqual([
			"old-title-1111aaaa",
			"b-2222bbbb",
			"new-title-1111aaaa",
		]);
	});

	it("caps the stack, dropping the oldest entries", () => {
		const locations = Array.from(
			{ length: MAX_HISTORY_ENTRIES + 5 },
			(_, i) => `node-${i}`,
		);
		const state = visitAll(...locations);

		expect(state.entries).toHaveLength(MAX_HISTORY_ENTRIES);
		expect(state.entries[0]).toBe("node-5");
		expect(at(state)).toBe(locations.at(-1));
		expect(state.index).toBe(MAX_HISTORY_ENTRIES - 1);
	});
});

describe("stepping", () => {
	it("cannot step in either direction from an empty history", () => {
		expect(canStepBack(emptyNavigationHistory)).toBe(false);
		expect(canStepForward(emptyNavigationHistory)).toBe(false);
		expect(previousLocation(emptyNavigationHistory)).toBeUndefined();
		expect(nextLocation(emptyNavigationHistory)).toBeUndefined();
	});

	it("cannot step back from the only visited node", () => {
		const state = visitAll("a-1111aaaa");

		expect(canStepBack(state)).toBe(false);
		expect(canStepForward(state)).toBe(false);
	});

	it("reports the adjacent entries once there is somewhere to go", () => {
		const state = visitAll(null, "a-1111aaaa", "b-2222bbbb");

		expect(canStepBack(state)).toBe(true);
		expect(canStepForward(state)).toBe(false);
		expect(previousLocation(state)).toBe("a-1111aaaa");

		const back = visit(state, "a-1111aaaa");

		expect(canStepForward(back)).toBe(true);
		expect(previousLocation(back)).toBeNull();
		expect(nextLocation(back)).toBe("b-2222bbbb");
	});

	it("walks the whole stack back to the start and forward again", () => {
		let state = visitAll(null, "a-1111aaaa", "b-2222bbbb");

		state = visit(state, previousLocation(state) as VisitedLocation);
		state = visit(state, previousLocation(state) as VisitedLocation);
		expect(at(state)).toBeNull();
		expect(canStepBack(state)).toBe(false);

		state = visit(state, nextLocation(state) as VisitedLocation);
		state = visit(state, nextLocation(state) as VisitedLocation);
		expect(at(state)).toBe("b-2222bbbb");
		expect(canStepForward(state)).toBe(false);
		expect(state.entries).toHaveLength(3);
	});
});
