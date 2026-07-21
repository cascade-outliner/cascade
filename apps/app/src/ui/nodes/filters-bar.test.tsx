// @vitest-environment jsdom

import { FiltersBar } from "@cascade/outliner/filters-bar";
import { noFilters } from "@cascade/outliner/node-filters";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => cleanup());

describe("FiltersBar tag filters", () => {
	it("lists existing tags in the filter menu", async () => {
		const onFiltersChange = vi.fn();
		render(
			<FiltersBar
				filters={noFilters}
				existingTags={[{ name: "work", count: 3 }]}
				onFiltersChange={onFiltersChange}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Filter" }));
		fireEvent.click(await screen.findByRole("menuitem", { name: "Tags" }));
		expect(await screen.findByPlaceholderText("Search tags…")).toBeTruthy();
		expect(screen.queryByText("3")).toBeNull();
		const tagOption = await screen.findByRole("button", { name: "work" });
		fireEvent.click(tagOption);

		expect(onFiltersChange).toHaveBeenCalledWith({
			...noFilters,
			tags: ["work"],
		});
	});

	it("does not offer tag creation while filtering", async () => {
		render(
			<FiltersBar
				filters={noFilters}
				existingTags={[{ name: "work", count: 3 }]}
				onFiltersChange={() => undefined}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Filter" }));
		fireEvent.click(await screen.findByRole("menuitem", { name: "Tags" }));
		const search = await screen.findByPlaceholderText("Search tags…");
		fireEvent.change(search, { target: { value: "brand new" } });

		expect(screen.queryByText(/Create/)).toBeNull();
	});

	it("renders one removable chip per tag without a label prefix", () => {
		render(
			<FiltersBar
				filters={{ ...noFilters, tags: ["work", "urgent"] }}
				onFiltersChange={() => undefined}
			/>,
		);

		expect(screen.getByText("work")).toBeTruthy();
		expect(screen.getByText("urgent")).toBeTruthy();
		expect(screen.queryByText(/Tag:/)).toBeNull();
	});
});
