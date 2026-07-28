// @vitest-environment jsdom

import { Popover, PopoverContent, PopoverTrigger } from "@cascade/ui/popover";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getAnimationsDescriptor = Object.getOwnPropertyDescriptor(
	HTMLElement.prototype,
	"getAnimations",
);

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	if (getAnimationsDescriptor) {
		Object.defineProperty(
			HTMLElement.prototype,
			"getAnimations",
			getAnimationsDescriptor,
		);
	} else {
		Reflect.deleteProperty(HTMLElement.prototype, "getAnimations");
	}
});

function deferred() {
	let resolve = () => {};
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

function OverlayHarness() {
	return (
		<Popover>
			<PopoverTrigger>Toggle popup</PopoverTrigger>
			<PopoverContent data-testid="popup">Popup content</PopoverContent>
		</Popover>
	);
}

describe("Base UI overlay lifecycle", () => {
	it("marks enter, waits for exit, then unmounts", async () => {
		const exit = deferred();
		Object.defineProperty(HTMLElement.prototype, "getAnimations", {
			configurable: true,
			value: vi.fn(() => [{ finished: exit.promise }]),
		});

		render(<OverlayHarness />);
		const trigger = screen.getByRole("button", { name: "Toggle popup" });

		fireEvent.click(trigger);
		const popup = screen.getByTestId("popup");
		expect(popup.hasAttribute("data-starting-style")).toBe(true);

		fireEvent.click(trigger);
		expect(popup.hasAttribute("data-ending-style")).toBe(true);
		expect(screen.getByTestId("popup")).toBe(popup);

		exit.resolve();
		await waitFor(() => expect(screen.queryByTestId("popup")).toBeNull());
	});

	it("cancels an interrupted exit without replacing popup content", async () => {
		const exit = deferred();
		Object.defineProperty(HTMLElement.prototype, "getAnimations", {
			configurable: true,
			value: vi.fn(() => [{ finished: exit.promise }]),
		});

		render(<OverlayHarness />);
		const trigger = screen.getByRole("button", { name: "Toggle popup" });

		fireEvent.click(trigger);
		const popup = screen.getByTestId("popup");
		fireEvent.click(trigger);
		expect(popup.hasAttribute("data-ending-style")).toBe(true);

		fireEvent.click(trigger);
		expect(screen.getByTestId("popup")).toBe(popup);
		await waitFor(() =>
			expect(popup.hasAttribute("data-ending-style")).toBe(false),
		);
	});
});
