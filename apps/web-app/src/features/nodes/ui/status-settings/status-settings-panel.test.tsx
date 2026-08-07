// @vitest-environment jsdom
import type { StatusWithUsage } from "@cascade/outliner/node-statuses";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { m } from "#/paraglide/messages.js";
import { useStatusManagement } from "@/features/nodes/client/statuses/use-existing-statuses";
import { StatusSettingsPanel } from "./status-settings-panel";

vi.mock("@/features/nodes/client/statuses/use-existing-statuses", () => ({
	useStatusManagement: vi.fn(),
}));

const statuses: StatusWithUsage[] = [
	{ id: "status-1", name: "To do", color: "sky", count: 3 },
	{ id: "status-2", name: "Done", color: "emerald", count: 0 },
];

function renderPanel(data: StatusWithUsage[] | undefined = statuses) {
	const management = {
		statusesQuery: {
			data,
			isPending: false,
			isError: false,
			refetch: vi.fn(),
		},
		createStatus: vi.fn(),
		isCreatingStatus: false,
		updateStatus: vi.fn(),
		updatingStatus: undefined,
		deleteStatus: vi.fn(),
		deletingStatus: undefined,
	};
	vi.mocked(useStatusManagement).mockReturnValue(
		management as unknown as ReturnType<typeof useStatusManagement>,
	);
	const { container } = render(<StatusSettingsPanel />);
	return { ...management, container };
}

describe("StatusSettingsPanel", () => {
	afterEach(() => {
		cleanup();
		vi.mocked(useStatusManagement).mockReset();
	});

	it("creates a status with the color picked from the palette", () => {
		const { createStatus, container } = renderPanel();
		const form = within(container.querySelector("form") as HTMLElement);

		fireEvent.change(
			form.getByPlaceholderText(m.settings_statuses_create_placeholder()),
			{ target: { value: "  In review  " } },
		);
		fireEvent.click(
			form.getByRole("radio", {
				name: m.settings_statuses_color_option({ color: "rose" }),
			}),
		);
		fireEvent.click(
			form.getByRole("button", { name: m.settings_statuses_create() }),
		);

		expect(createStatus).toHaveBeenCalledWith(
			"In review",
			"rose",
			expect.any(Function),
		);
	});

	it("refuses to create a status whose name already exists", () => {
		const { createStatus } = renderPanel();

		fireEvent.change(
			screen.getByPlaceholderText(m.settings_statuses_create_placeholder()),
			{ target: { value: "to do" } },
		);

		expect(screen.getByRole("alert").textContent).toBe(
			m.settings_statuses_name_exists(),
		);
		expect(
			screen
				.getByRole("button", { name: m.settings_statuses_create() })
				.hasAttribute("disabled"),
		).toBe(true);
		expect(createStatus).not.toHaveBeenCalled();
	});

	it("renames and recolors an existing status", () => {
		const { updateStatus, container } = renderPanel();

		fireEvent.click(
			screen.getByRole("button", {
				name: m.settings_statuses_edit_label({ name: "To do" }),
			}),
		);
		const row = within(container.querySelectorAll("li")[0] as HTMLElement);
		fireEvent.change(row.getByLabelText(m.settings_statuses_name_label()), {
			target: { value: "Backlog" },
		});
		fireEvent.click(
			row.getByRole("radio", {
				name: m.settings_statuses_color_option({ color: "violet" }),
			}),
		);
		fireEvent.click(
			row.getByRole("button", { name: m.settings_statuses_save() }),
		);

		expect(updateStatus).toHaveBeenCalledWith(
			"status-1",
			{ name: "Backlog", color: "violet" },
			expect.any(Function),
		);
	});

	it("confirms a delete with the status's usage count", () => {
		const { deleteStatus } = renderPanel();

		fireEvent.click(
			screen.getByRole("button", {
				name: m.settings_statuses_delete_label({ name: "To do" }),
			}),
		);

		const dialog = screen.getByRole("alertdialog");
		expect(dialog.textContent).toContain(
			m.settings_statuses_delete_description({ name: "To do", count: 3 }),
		);
		fireEvent.click(
			within(dialog).getByRole("button", {
				name: m.settings_statuses_delete(),
			}),
		);

		expect(deleteStatus).toHaveBeenCalledWith("status-1", expect.any(Function));
	});

	it("shows an empty state when the user has no statuses yet", () => {
		renderPanel([]);

		// Both throw if the empty state isn't rendered.
		screen.getByText(m.settings_statuses_empty());
		screen.getByText(m.settings_statuses_empty_description());
	});
});
