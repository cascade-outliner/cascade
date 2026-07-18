// @vitest-environment jsdom

import { LexicalEditView } from "@cascade/outliner/lexical/edit/lexical-edit-view";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
	cleanup();
});

// jsdom's Range doesn't implement getBoundingClientRect, which Lexical calls
// while syncing the native selection after an update.
Range.prototype.getBoundingClientRect = () => new DOMRect();

// jsdom doesn't implement ClipboardEvent/DataTransfer; our paste handler only
// needs `instanceof ClipboardEvent` plus `clipboardData.getData(...)` to work.
class FakeClipboardEvent extends Event {
	clipboardData: { getData: (type: string) => string };
	constructor(type: string, text: string) {
		super(type, { bubbles: true, cancelable: true });
		this.clipboardData = { getData: () => text };
	}
}
// biome-ignore lint/suspicious/noExplicitAny: test-only global shim
(globalThis as any).ClipboardEvent = FakeClipboardEvent;

function pasteText(target: Element, text: string) {
	target.dispatchEvent(new FakeClipboardEvent("paste", text));
}

describe("pasting a url into the editor", () => {
	it("converts a lone pasted url into a link node with a tidy label", async () => {
		const onSave = vi.fn();
		const { container } = render(
			<LexicalEditView
				id="test-node"
				content={null}
				focusPoint={null}
				onSave={onSave}
			/>,
		);

		const editable = container.querySelector(
			'[contenteditable="true"]',
		) as HTMLElement;
		expect(editable).not.toBeNull();

		pasteText(editable, "https://www.example.com/some/long/path?query=1");

		await waitFor(() => {
			expect(editable.querySelector("button")).not.toBeNull();
		});

		// The label is a button (opens the edit popover) rather than a plain
		// anchor, so clicking it doesn't navigate away from the outliner.
		const trigger = editable.querySelector("button");
		expect(trigger?.textContent).toBe("example.com/some/long/path?query=1");

		// The small icon next to it is the one thing that still navigates
		// directly, bypassing the popover.
		const openIcon = editable.querySelector("a");
		expect(openIcon?.getAttribute("href")).toBe(
			"https://www.example.com/some/long/path?query=1",
		);
		expect(openIcon?.getAttribute("title")).toBe(
			"https://www.example.com/some/long/path?query=1",
		);
	});
});

describe("editing a link via its popover", () => {
	it("opens a popover on click, lets the title/url be edited, and saves on close", async () => {
		const onSave = vi.fn();
		const { container } = render(
			<LexicalEditView
				id="test-node-3"
				content={null}
				focusPoint={null}
				onSave={onSave}
			/>,
		);

		const editable = container.querySelector(
			'[contenteditable="true"]',
		) as HTMLElement;
		pasteText(editable, "https://example.com/docs");

		await waitFor(() => {
			expect(editable.querySelector("button")).not.toBeNull();
		});

		fireEvent.click(editable.querySelector("button") as HTMLElement);

		const titleInput = await waitFor(() => {
			const input = document.querySelector(
				'input[value="example.com/docs"]',
			) as HTMLInputElement | null;
			if (!input) throw new Error("title input not found yet");
			return input;
		});

		fireEvent.change(titleInput, { target: { value: "Docs" } });

		// The visible label updates live as you type, before the popover closes.
		await waitFor(() => {
			expect(editable.querySelector("button")?.textContent).toBe("Docs");
		});

		const urlInput = document.querySelector(
			'input[value="https://example.com/docs"]',
		) as HTMLInputElement;
		fireEvent.change(urlInput, {
			target: { value: "https://example.com/updated" },
		});

		// Closing the popover (Escape) should persist the edits even though the
		// row's own blur handler was suppressed while the popover was open.
		fireEvent.keyDown(document.activeElement ?? document.body, {
			key: "Escape",
		});

		await waitFor(() => {
			expect(onSave).toHaveBeenCalled();
		});

		const lastSave = onSave.mock.calls.at(-1)?.[0];
		const paragraph = lastSave?.root?.children?.[0];
		const link = paragraph?.children?.[0];
		expect(link?.type).toBe("link");
		expect(link?.url).toBe("https://example.com/updated");
		expect(link?.children?.[0]?.text).toBe("Docs");
	});
});
