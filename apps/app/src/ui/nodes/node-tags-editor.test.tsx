// @vitest-environment jsdom

import { MAX_TAG_LENGTH } from "@cascade/outliner/node-tags";
import { NodeTagsEditor } from "@cascade/outliner/node-tags-editor";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
	cleanup();
});

function setup(onChange = vi.fn()) {
	render(
		<NodeTagsEditor
			tags={[]}
			existingTags={[{ name: "urgent", count: 2 }]}
			onChange={onChange}
		/>,
	);
	return { input: screen.getByRole("combobox"), onChange };
}

describe("NodeTagsEditor tag length limit", () => {
	it("offers the create row for a name exactly at the limit", () => {
		const { input, onChange } = setup();
		fireEvent.change(input, { target: { value: "a".repeat(MAX_TAG_LENGTH) } });
		expect(screen.getByText(/Create/)).toBeDefined();
		fireEvent.keyDown(input, { key: "Enter" });
		expect(onChange).toHaveBeenCalledWith(["a".repeat(MAX_TAG_LENGTH)]);
	});

	it("blocks creation and shows a validation message over the limit", () => {
		const { input, onChange } = setup();
		fireEvent.change(input, {
			target: { value: "a".repeat(MAX_TAG_LENGTH + 1) },
		});
		expect(screen.queryByText(/Create/)).toBeNull();
		expect(screen.getByRole("alert").textContent).toContain("too long");
		fireEvent.keyDown(input, { key: "Enter" });
		expect(onChange).not.toHaveBeenCalled();
	});

	it("shows the remaining-character counter only near the limit", () => {
		const { input } = setup();
		fireEvent.change(input, { target: { value: "short" } });
		expect(screen.queryByText(`5/${MAX_TAG_LENGTH}`)).toBeNull();
		const near = "a".repeat(MAX_TAG_LENGTH - 4);
		fireEvent.change(input, { target: { value: near } });
		expect(screen.getByText(`${near.length}/${MAX_TAG_LENGTH}`)).toBeDefined();
	});

	it("renders keyboard hints as semantic keyboard labels", () => {
		setup();

		const labels = screen.getAllByText(/↑↓|↵/);
		expect(labels).toHaveLength(2);
		expect(labels.map((element) => element.tagName)).toEqual(["KBD", "KBD"]);
	});
});
