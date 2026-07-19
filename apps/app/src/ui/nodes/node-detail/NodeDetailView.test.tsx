// @vitest-environment jsdom
import type { TagSummary } from "@cascade/outliner/node-tags";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { NodeDetailHeader } from "./NodeDetailView";

vi.mock("#/ui/nodes/breadcrumbs", () => ({
	Breadcrumbs: () => null,
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		params,
		search: _search,
		...props
	}: {
		children: ReactNode;
		params: { nodeSlug: string };
		search?: boolean;
	}) => (
		<a href={`/${params.nodeSlug}`} {...props}>
			{children}
		</a>
	),
}));

const emptyTags: TagSummary[] = [];
const noop = () => {};

describe("NodeDetailHeader backlinks", () => {
	it("renders linked mentions as navigable entries", () => {
		render(
			<NodeDetailHeader
				node={{
					id: "11111111-1111-4111-8111-111111111111",
					parentId: null,
					content: {
						root: {
							type: "root",
							children: [
								{
									type: "paragraph",
									children: [{ type: "text", text: "Target" }],
								},
							],
						},
					},
					type: "text",
					metadata: null,
					expanded: false,
					order: "a0",
					dueDate: null,
					tags: [],
					hasChildren: false,
				}}
				backlinks={[
					{
						id: "22222222-2222-4222-8222-222222222222",
						content: {
							root: {
								type: "root",
								children: [
									{
										type: "paragraph",
										children: [{ type: "text", text: "Source node" }],
									},
								],
							},
						},
					},
				]}
				dueDate={null}
				completed={false}
				existingTags={emptyTags}
				onToggleTask={noop}
				onDueDateChange={noop}
				onTagsChange={noop}
				onDeleteTag={noop}
			/>,
		);

		expect(screen.getByText("Linked mentions")).toBeTruthy();
		const link = screen.getByRole("link", { name: "Source node" });
		expect(link.getAttribute("href")).toBe("/source-node-22222222");
	});
});
