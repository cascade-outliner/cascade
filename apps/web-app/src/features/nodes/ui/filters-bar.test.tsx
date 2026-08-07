// @vitest-environment jsdom

import { FiltersBar } from "@cascade/outliner/filters-bar";
import { noFilters } from "@cascade/outliner/node-filters";
import { MotionProvider } from "@cascade/ui/motion-provider";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => cleanup());

function renderWithMotion(children: ReactNode) {
	return render(<MotionProvider>{children}</MotionProvider>);
}

describe("FiltersBar tag filters", () => {
	it("lists existing tags in the filter menu", async () => {
		const onFiltersChange = vi.fn();
		renderWithMotion(
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
		renderWithMotion(
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
		renderWithMotion(
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

describe("FiltersBar priority and status filters", () => {
	const blocked = { id: "status-blocked", name: "Blocked", color: "sky" };

	it("toggles a priority level from the filter menu", async () => {
		const onFiltersChange = vi.fn();
		renderWithMotion(
			<FiltersBar filters={noFilters} onFiltersChange={onFiltersChange} />,
		);

		fireEvent.click(screen.getByRole("button", { name: "Filter" }));
		fireEvent.click(await screen.findByRole("menuitem", { name: "Priority" }));
		fireEvent.click(
			await screen.findByRole("menuitemcheckbox", { name: "Urgent" }),
		);

		expect(onFiltersChange).toHaveBeenCalledWith({
			...noFilters,
			priorities: ["urgent"],
		});
	});

	it("selects a status from the filter menu", async () => {
		const onFiltersChange = vi.fn();
		renderWithMotion(
			<FiltersBar
				filters={noFilters}
				existingStatuses={[blocked]}
				onFiltersChange={onFiltersChange}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Filter" }));
		fireEvent.click(await screen.findByRole("menuitem", { name: "Status" }));
		fireEvent.click(await screen.findByRole("button", { name: "Blocked" }));

		expect(onFiltersChange).toHaveBeenCalledWith({
			...noFilters,
			statusIds: [blocked.id],
		});
	});

	it("hides the status submenu until the user has a status", async () => {
		renderWithMotion(
			<FiltersBar filters={noFilters} onFiltersChange={() => undefined} />,
		);

		fireEvent.click(screen.getByRole("button", { name: "Filter" }));
		await screen.findByRole("menuitem", { name: "Priority" });
		expect(screen.queryByRole("menuitem", { name: "Status" })).toBeNull();
	});

	it("renders removable chips for active priority and status filters", () => {
		const onFiltersChange = vi.fn();
		renderWithMotion(
			<FiltersBar
				filters={{
					...noFilters,
					priorities: ["urgent"],
					statusIds: [blocked.id],
				}}
				existingStatuses={[blocked]}
				onFiltersChange={onFiltersChange}
			/>,
		);

		expect(screen.getByText("Urgent")).toBeTruthy();
		expect(screen.getByText("Blocked")).toBeTruthy();

		fireEvent.click(
			screen.getByRole("button", { name: "Remove priority filter: Urgent" }),
		);
		expect(onFiltersChange).toHaveBeenCalledWith({
			...noFilters,
			priorities: [],
			statusIds: [blocked.id],
		});
	});
});
