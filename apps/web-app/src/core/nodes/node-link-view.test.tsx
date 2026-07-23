// @vitest-environment jsdom

import type { LexicalElementNode } from "@cascade/outliner/lexical/read/lexical-read-view";
import { LexicalReadView } from "@cascade/outliner/lexical/read/lexical-read-view";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
	cleanup();
});

function linkContent(url: string, label: string) {
	return {
		root: {
			type: "root",
			children: [
				{
					type: "paragraph",
					children: [
						{ type: "text", text: "see " },
						{ type: "link", url, children: [{ type: "text", text: label }] },
					],
				},
			],
		} as LexicalElementNode,
	};
}

describe("link click-to-edit popover", () => {
	it("opens on click without bubbling to the row, and saves edited text and URL", async () => {
		const onSaveLink = vi.fn();
		const onRowClick = vi.fn();

		render(
			// Stand-in for the node row's click-to-edit wrapper.
			// biome-ignore lint/a11y/useKeyWithClickEvents: test stand-in for the row wrapper
			// biome-ignore lint/a11y/noStaticElementInteractions: test stand-in for the row wrapper
			<div onClick={onRowClick}>
				<LexicalReadView
					content={linkContent("https://example.com/old", "example.com/old")}
					onSaveLink={onSaveLink}
				/>
			</div>,
		);

		fireEvent.click(screen.getByRole("link", { name: "example.com/old" }));
		// The link click must not fall through to the row (which would enter edit mode).
		expect(onRowClick).not.toHaveBeenCalled();

		const textInput = (await screen.findByLabelText(
			"Text",
		)) as HTMLInputElement;
		const urlInput = screen.getByLabelText("URL") as HTMLInputElement;
		expect(textInput.value).toBe("example.com/old");
		expect(urlInput.value).toBe("https://example.com/old");

		fireEvent.change(textInput, { target: { value: "the docs" } });
		fireEvent.change(urlInput, { target: { value: "example.com/new" } });
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		// Path: paragraph 0 → child 1; URL normalized to https.
		expect(onSaveLink).toHaveBeenCalledWith([0, 1], {
			text: "the docs",
			url: "https://example.com/new",
		});
	});

	it("delete calls onDeleteLink with the current Text field value", async () => {
		const onSaveLink = vi.fn();
		const onDeleteLink = vi.fn();

		render(
			<LexicalReadView
				content={linkContent("https://example.com/old", "example.com/old")}
				onSaveLink={onSaveLink}
				onDeleteLink={onDeleteLink}
			/>,
		);

		fireEvent.click(screen.getByRole("link", { name: "example.com/old" }));
		const textInput = (await screen.findByLabelText("Text", {
			selector: "input",
		})) as HTMLInputElement;
		fireEvent.change(textInput, { target: { value: "kept text" } });
		fireEvent.click(screen.getByRole("button", { name: "Remove link" }));

		expect(onDeleteLink).toHaveBeenCalledWith([0, 1], { text: "kept text" });
		expect(onSaveLink).not.toHaveBeenCalled();
	});

	it("disables save while the URL is invalid", async () => {
		const onSaveLink = vi.fn();

		render(
			<LexicalReadView
				content={linkContent("https://example.com", "example.com")}
				onSaveLink={onSaveLink}
			/>,
		);

		fireEvent.click(screen.getByRole("link", { name: "example.com" }));
		const urlInput = (await screen.findByLabelText("URL")) as HTMLInputElement;
		fireEvent.change(urlInput, { target: { value: "javascript:alert(1)" } });

		const save = screen.getByRole("button", {
			name: "Save",
		}) as HTMLButtonElement;
		expect(save.disabled).toBe(true);
	});

	it("renders a plain external anchor when no save handler is provided", () => {
		render(
			<LexicalReadView
				content={linkContent("https://example.com", "example.com")}
			/>,
		);
		const anchor = screen.getByRole("link", { name: "example.com" });
		expect(anchor.getAttribute("target")).toBe("_blank");
		expect(anchor.getAttribute("href")).toBe("https://example.com");
	});
});
