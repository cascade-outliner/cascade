// @vitest-environment jsdom

import { LexicalEditView } from "@cascade/outliner/lexical/edit/lexical-edit-view";
import type { LexicalElementNode } from "@cascade/outliner/lexical/read/lexical-read-view";
import { cleanup, render, waitFor } from "@testing-library/react";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const originalRangeBoundingRect = Range.prototype.getBoundingClientRect;

beforeAll(() => {
	Range.prototype.getBoundingClientRect = () => new DOMRect();
});

afterAll(() => {
	Range.prototype.getBoundingClientRect = originalRangeBoundingRect;
});

afterEach(() => {
	cleanup();
});

describe("LexicalEditView heading styles", () => {
	const headingClasses = {
		h1: "text-4xl font-bold",
		h2: "text-3xl font-bold",
		h3: "text-2xl font-bold",
		h4: "text-xl font-bold",
		h5: "text-lg font-bold",
		h6: "text-base font-bold",
	} as const;

	for (const tag of Object.keys(headingClasses) as Array<
		keyof typeof headingClasses
	>) {
		it(`keeps the ${tag} styling while editing`, async () => {
			const content = {
				root: {
					type: "root",
					children: [
						{
							type: "heading",
							tag,
							children: [{ type: "text", text: "A heading" }],
						},
					],
				} as LexicalElementNode,
			};

			const { container } = render(
				<LexicalEditView
					id={`heading-${tag}`}
					content={content}
					focusPoint={null}
					onSave={vi.fn()}
				/>,
			);

			await waitFor(() => {
				const heading = container.querySelector(tag);
				expect(heading).not.toBeNull();
				expect(heading?.className).toBe(headingClasses[tag]);
			});
		});
	}
});
