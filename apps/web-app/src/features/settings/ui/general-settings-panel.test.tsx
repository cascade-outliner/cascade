// @vitest-environment jsdom
import { toast } from "@cascade/ui/toast";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { m } from "#/paraglide/messages.js";
import { defaultSettings } from "../model/default-settings";
import { GeneralSettingsPanel } from "./general-settings-panel";

vi.mock("@cascade/ui/toast", () => ({
	toast: {
		info: vi.fn(),
		warning: vi.fn(),
	},
}));

function renderPanel() {
	const setSetting = vi.fn();
	render(
		<GeneralSettingsPanel
			settings={{
				...defaultSettings(),
				enabledNodeCapabilities: ["paragraph", "task", "due-date", "duplicate"],
			}}
			setSetting={setSetting}
			onReplayTour={vi.fn()}
			isReplayingTour={false}
		/>,
		{ wrapper: withNuqsTestingAdapter() },
	);
	return { setSetting };
}

describe("GeneralSettingsPanel — due-date notifications toggle", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		vi.mocked(toast.info).mockReset();
		vi.mocked(toast.warning).mockReset();
	});

	it("shows an unsupported toast and the unsupported description when the browser has no Notification API", async () => {
		vi.stubGlobal("Notification", undefined);
		renderPanel();

		fireEvent.click(
			screen.getByRole("checkbox", {
				name: m.settings_due_date_notifications(),
			}),
		);

		await waitFor(() => expect(toast.info).toHaveBeenCalledTimes(1));
		expect(toast.warning).not.toHaveBeenCalled();
		// Throws if the unsupported-browser copy isn't rendered.
		screen.getByText(
			m.settings_due_date_notifications_description_unsupported(),
		);
	});

	it("shows the existing permission-denied warning when Notification is supported but denied", async () => {
		vi.stubGlobal("Notification", {
			requestPermission: vi.fn().mockResolvedValue("denied"),
		});
		renderPanel();

		fireEvent.click(
			screen.getByRole("checkbox", {
				name: m.settings_due_date_notifications(),
			}),
		);

		await waitFor(() => expect(toast.warning).toHaveBeenCalledTimes(1));
		expect(toast.info).not.toHaveBeenCalled();
	});
});
