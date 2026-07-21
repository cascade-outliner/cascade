// @vitest-environment jsdom

import { NodeTagPills } from "@cascade/outliner/features/tags/node-tags-pills";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => cleanup());

describe("NodeTagPills", () => {
	it("turns tags into buttons that activate the selected tag", () => {
		const onTagClick = vi.fn();
		render(<NodeTagPills tags={["work"]} onTagClick={onTagClick} />);

		const pill = screen.getByRole("button", { name: "work" });
		fireEvent.click(pill);

		expect(onTagClick).toHaveBeenCalledWith("work");
	});

	it("does not let a tag click reach the containing row", () => {
		const onRowClick = vi.fn();
		render(
			<div
				role="treeitem"
				tabIndex={-1}
				onClick={onRowClick}
				onKeyDown={() => undefined}
			>
				<NodeTagPills tags={["work"]} onTagClick={() => undefined} />
			</div>,
		);

		fireEvent.click(screen.getByRole("button", { name: "work" }));

		expect(onRowClick).not.toHaveBeenCalled();
	});
});
