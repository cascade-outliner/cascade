// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { m } from "#/paraglide/messages.js";
import { defaultSettings } from "../model/default-settings";
import { FeaturesSettingsPanel } from "./features-settings-panel";

describe("FeaturesSettingsPanel", () => {
	afterEach(cleanup);

	it("renders the minimal preset and enables dependencies atomically", () => {
		const setSetting = vi.fn();
		render(
			<FeaturesSettingsPanel
				settings={defaultSettings()}
				setSetting={setSetting}
			/>,
		);

		expect(
			screen
				.getByRole("checkbox", { name: m.settings_feature_task() })
				.getAttribute("aria-checked"),
		).toBe("true");
		fireEvent.click(
			screen.getByRole("checkbox", { name: m.settings_feature_paragraph() }),
		);
		expect(setSetting).not.toHaveBeenCalled();
		expect(
			screen
				.getByRole("checkbox", { name: m.settings_feature_due_date() })
				.getAttribute("aria-checked"),
		).toBe("false");

		fireEvent.click(
			screen.getByRole("checkbox", { name: m.settings_feature_recurrence() }),
		);
		expect(setSetting).toHaveBeenCalledWith("enabledNodeCapabilities", [
			"task",
			"due-date",
			"recurrence",
			"paragraph",
			"duplicate",
		]);
	});
});
