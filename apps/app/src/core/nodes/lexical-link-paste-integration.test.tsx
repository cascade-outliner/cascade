// @vitest-environment jsdom

import { LexicalEditView } from "@cascade/outliner/lexical/edit/lexical-edit-view";
import { cleanup, render, waitFor } from "@testing-library/react";
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
			const link = editable.querySelector("a");
			expect(link).not.toBeNull();
		});

		const link = editable.querySelector("a");
		expect(link?.getAttribute("href")).toBe(
			"https://www.example.com/some/long/path?query=1",
		);
		expect(link?.getAttribute("title")).toBe(
			"https://www.example.com/some/long/path?query=1",
		);
		expect(link?.textContent).toBe("example.com/some/long/path?query=1");
	});
});
