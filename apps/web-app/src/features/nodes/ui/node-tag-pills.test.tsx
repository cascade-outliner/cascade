// @vitest-environment jsdom

import { NodeTagPills } from "@cascade/outliner/features/tags/node-tags-pills";
import { MotionProvider } from "@cascade/ui/motion-provider";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

function renderWithMotion(children: ReactNode) {
	return render(<MotionProvider>{children}</MotionProvider>);
}

describe("NodeTagPills", () => {
	it("removes scale motion when reduced motion is requested", async () => {
		vi.stubGlobal("matchMedia", () => ({
			matches: true,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}));
		const { rerender } = renderWithMotion(<NodeTagPills tags={[]} />);

		rerender(
			<MotionProvider>
				<NodeTagPills tags={["work"]} />
			</MotionProvider>,
		);

		const pillMotionWrapper =
			screen.getByText("work").parentElement?.parentElement;
		expect(pillMotionWrapper?.style.opacity).toBe("0");
		await waitFor(() => {
			expect(pillMotionWrapper?.style.transform).toBe("none");
		});
	});

	it("turns tags into buttons that activate the selected tag", () => {
		const onTagClick = vi.fn();
		renderWithMotion(<NodeTagPills tags={["work"]} onTagClick={onTagClick} />);

		const pill = screen.getByRole("button", { name: "work" });
		fireEvent.click(pill);

		expect(onTagClick).toHaveBeenCalledWith("work");
	});

	it("does not let a tag click reach the containing row", () => {
		const onRowClick = vi.fn();
		renderWithMotion(
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

	it("cancels a rapid tag exit without leaving a stale pill", () => {
		const { rerender } = renderWithMotion(<NodeTagPills tags={["work"]} />);

		rerender(
			<MotionProvider>
				<NodeTagPills tags={[]} />
			</MotionProvider>,
		);
		rerender(
			<MotionProvider>
				<NodeTagPills tags={["work"]} />
			</MotionProvider>,
		);

		expect(screen.getAllByText("work")).toHaveLength(1);
	});

	it("keeps a pill accessible during exit, then removes it", async () => {
		const { rerender } = renderWithMotion(
			<NodeTagPills tags={["work"]} onTagClick={() => undefined} />,
		);

		rerender(
			<MotionProvider>
				<NodeTagPills tags={[]} onTagClick={() => undefined} />
			</MotionProvider>,
		);

		expect(screen.getByRole("button", { name: "work" })).toBeTruthy();
		await waitFor(() => {
			expect(screen.queryByRole("button", { name: "work" })).toBeNull();
		});
	});
});
