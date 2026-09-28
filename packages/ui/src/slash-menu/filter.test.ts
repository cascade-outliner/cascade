import { describe, expect, it } from "vitest";
import {
	filterSlashMenuItems,
	groupSlashMenuItems,
	type SlashMenuItem,
} from "./filter.ts";

const items: SlashMenuItem[] = [
	{ id: "task", label: "Turn into task", group: "Convert", keywords: ["todo"] },
	{ id: "text", label: "Turn into text", group: "Convert" },
	{ id: "today", label: "Due today", group: "Due date" },
	{ id: "tomorrow", label: "Due tomorrow", group: "Due date" },
	{ id: "duplicate", label: "Duplicate", group: "Organize" },
	{ id: "delete", label: "Delete", group: "Node", danger: true },
];

const ids = (list: SlashMenuItem[]) => list.map((item) => item.id);

describe("filterSlashMenuItems", () => {
	it("keeps everything, in order, for an empty query", () => {
		expect(ids(filterSlashMenuItems(items, ""))).toEqual(ids(items));
		expect(ids(filterSlashMenuItems(items, "   "))).toEqual(ids(items));
	});

	it("drops items that don't match", () => {
		expect(ids(filterSlashMenuItems(items, "tomorrow"))).toEqual(["tomorrow"]);
		expect(filterSlashMenuItems(items, "zzz")).toEqual([]);
	});

	it("ignores case", () => {
		expect(ids(filterSlashMenuItems(items, "DUE"))).toEqual([
			"today",
			"tomorrow",
		]);
	});

	it("matches on any word of the label and on keywords", () => {
		expect(ids(filterSlashMenuItems(items, "todo"))).toEqual(["task"]);
		expect(ids(filterSlashMenuItems(items, "tom"))).toEqual(["tomorrow"]);
	});

	it("puts label prefixes first but keeps groups together", () => {
		// "du": Due today/Due tomorrow (prefix) and Duplicate (prefix); Convert has no match.
		expect(ids(filterSlashMenuItems(items, "du"))).toEqual([
			"today",
			"tomorrow",
			"duplicate",
		]);
		// "t": Convert wins on "Turn…" (prefix); Due date follows with word matches.
		expect(ids(filterSlashMenuItems(items, "t"))).toEqual([
			"task",
			"text",
			"today",
			"tomorrow",
		]);
	});

	it("only matches from the start of a word", () => {
		expect(ids(filterSlashMenuItems(items, "ask"))).toEqual([]);
		expect(ids(filterSlashMenuItems(items, "te"))).toEqual(["text"]);
	});

	it("orders groups by their best match", () => {
		const list: SlashMenuItem[] = [
			{ id: "a", label: "Copy link", group: "Node", keywords: ["due"] },
			{ id: "b", label: "Due today", group: "Due date" },
		];
		expect(ids(filterSlashMenuItems(list, "du"))).toEqual(["b", "a"]);
	});
});

describe("groupSlashMenuItems", () => {
	it("splits consecutive runs of the same group", () => {
		expect(
			groupSlashMenuItems(items).map((group) => [
				group.label,
				ids(group.items),
			]),
		).toEqual([
			["Convert", ["task", "text"]],
			["Due date", ["today", "tomorrow"]],
			["Organize", ["duplicate"]],
			["Node", ["delete"]],
		]);
	});

	it("returns nothing for no items", () => {
		expect(groupSlashMenuItems([])).toEqual([]);
	});
});
