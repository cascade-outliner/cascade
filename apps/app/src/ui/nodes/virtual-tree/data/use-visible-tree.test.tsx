// @vitest-environment jsdom
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { toast } from "@cascade/ui/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { m } from "#/paraglide/messages.js";
import { client, orpc } from "@/orpc/client";
import { useVisibleTree, visibleTreeOptions } from "./use-visible-tree";

vi.mock("@/orpc/client", () => ({
	client: {
		nodes: {
			updateContent: vi.fn(),
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

const row: VisibleNodeRow = {
	id: "node-1",
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
	hasChildren: false,
	isLastChild: true,
};

function renderVisibleTree(
	queryClient: QueryClient,
	includeCollapsedDescendants = false,
) {
	return renderHook(() => useVisibleTree(null, includeCollapsedDescendants), {
		wrapper: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	});
}

describe("useVisibleTree.updateContent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(orpc.nodes.visibleTree.queryOptions).mockImplementation(
			({ input }) =>
				({
					queryKey: ["nodes", "visibleTree", { input }],
					queryFn: () => Promise.resolve({ rows: [row], nextCursor: null }),
				}) as never,
		);
	});

	it("shows an error toast and reverts when the server rejects the update", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions(null).queryKey, {
			rows: [row],
			nextCursor: null,
		});
		vi.mocked(client.nodes.updateContent).mockRejectedValueOnce(
			new Error("input validation failed"),
		);

		const { result } = renderVisibleTree(queryClient);

		await result.current.updateContent("node-1", {
			root: { type: "root", children: [] },
		});

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(m.node_save_failed());
		});
	});

	it("does not show an error toast when the update succeeds", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions(null).queryKey, {
			rows: [row],
			nextCursor: null,
		});
		vi.mocked(client.nodes.updateContent).mockResolvedValueOnce(undefined);

		const { result } = renderVisibleTree(queryClient);

		await result.current.updateContent("node-1", {
			root: { type: "root", children: [] },
		});

		expect(toast.error).not.toHaveBeenCalled();
	});

	it("requests collapsed descendants when a due-date filter is active", () => {
		const queryClient = new QueryClient();

		renderVisibleTree(queryClient, true);

		expect(orpc.nodes.visibleTree.queryOptions).toHaveBeenCalledWith({
			input: { rootId: null, includeCollapsedDescendants: true },
		});
	});
});
