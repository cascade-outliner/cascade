// @vitest-environment jsdom
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { client, orpc } from "@/orpc/client";
import { useVisibleTree, visibleTreeOptions } from "../use-visible-tree";

vi.mock("@/orpc/client", () => ({
	client: {
		nodes: {
			create: vi.fn(),
			updateContent: vi.fn(),
			move: vi.fn(),
			toggleExpanded: vi.fn(),
			visibleTree: vi.fn(),
		},
	},
	orpc: {
		nodes: {
			visibleTree: {
				queryOptions: vi.fn(),
			},
			ancestors: {
				key: vi.fn(() => ["nodes", "ancestors"]),
			},
		},
	},
}));

vi.mock("@cascade/ui/toast", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

const root: VisibleNodeRow = {
	id: "root",
	parentId: null,
	content: { root: { type: "root", children: [] } },
	type: "text",
	metadata: null,
	expanded: false,
	order: "a0",
	dueDate: null,
	tags: [],
	depth: 0,
	path: ["a0"],
	hasChildren: true,
	isLastChild: true,
};

function child(id: string, order: string): VisibleNodeRow {
	return {
		id,
		parentId: "root",
		content: { root: { type: "root", children: [] } },
		type: "text",
		metadata: null,
		expanded: false,
		order,
		dueDate: null,
		tags: [],
		depth: 0,
		path: [order],
		hasChildren: false,
		isLastChild: false,
	};
}

function renderVisibleTree(queryClient: QueryClient) {
	return renderHook(() => useVisibleTree(null), {
		wrapper: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	});
}

describe("useVisibleTree.toggle (expand)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(orpc.nodes.visibleTree.queryOptions).mockImplementation(
			({ input }) =>
				({
					queryKey: ["nodes", "visibleTree", { input }],
					queryFn: () => Promise.resolve({ rows: [root], nextCursor: null }),
				}) as never,
		);
	});

	it("walks every nextCursor page so expanding a node with more descendants than the page limit doesn't truncate", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions(null).queryKey, {
			rows: [root],
			nextCursor: null,
		});
		vi.mocked(client.nodes.visibleTree)
			.mockResolvedValueOnce({ rows: [child("c1", "a0")], nextCursor: ["b0"] })
			.mockResolvedValueOnce({ rows: [child("c2", "b0")], nextCursor: null });
		vi.mocked(client.nodes.toggleExpanded).mockResolvedValueOnce(undefined);

		const { result } = renderVisibleTree(queryClient);

		result.current.toggle("root", true);

		await waitFor(() => {
			const data = queryClient.getQueryData<{ rows: VisibleNodeRow[] }>(
				visibleTreeOptions(null).queryKey,
			);
			expect(data?.rows.map((r) => r.id)).toEqual(["root", "c1", "c2"]);
		});

		expect(client.nodes.visibleTree).toHaveBeenCalledTimes(2);
		expect(client.nodes.visibleTree).toHaveBeenNthCalledWith(1, {
			rootId: "root",
			cursor: null,
		});
		expect(client.nodes.visibleTree).toHaveBeenNthCalledWith(2, {
			rootId: "root",
			cursor: ["b0"],
		});
	});

	it("expands without paginating further when the subtree fits in a single page", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions(null).queryKey, {
			rows: [root],
			nextCursor: null,
		});
		vi.mocked(client.nodes.visibleTree).mockResolvedValueOnce({
			rows: [child("c1", "a0")],
			nextCursor: null,
		});
		vi.mocked(client.nodes.toggleExpanded).mockResolvedValueOnce(undefined);

		const { result } = renderVisibleTree(queryClient);

		result.current.toggle("root", true);

		await waitFor(() => {
			const data = queryClient.getQueryData<{ rows: VisibleNodeRow[] }>(
				visibleTreeOptions(null).queryKey,
			);
			expect(data?.rows.map((r) => r.id)).toEqual(["root", "c1"]);
		});

		expect(client.nodes.visibleTree).toHaveBeenCalledTimes(1);
	});
});
