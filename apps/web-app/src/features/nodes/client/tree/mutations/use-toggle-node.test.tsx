// @vitest-environment jsdom
import type { FlatNodeRow } from "@cascade/outliner/node-types";
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

const root: FlatNodeRow = {
	id: "root",
	parentId: null,
	content: { root: { type: "root", children: [] } },
	type: "text",
	metadata: null,
	expanded: false,
	order: "a0",
	dueDate: null,
	tags: [],
};

function child(id: string, order: string): FlatNodeRow {
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
	};
}

const queryKey = ["nodes", "visibleTree"];

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
		vi.mocked(orpc.nodes.visibleTree.queryOptions).mockReturnValue({
			queryKey,
			queryFn: () => Promise.resolve({ rows: [root] }),
		} as never);
	});

	// Every descendant is already in the shared cache (the whole tree is
	// fetched once), so expanding a node with already-loaded children reveals
	// them instantly, with no further `visibleTree` calls needed.
	it("reveals already-cached descendants without another visibleTree call", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions().queryKey, {
			rows: [root, child("c1", "a0"), child("c2", "b0")],
		});
		vi.mocked(client.nodes.toggleExpanded).mockResolvedValueOnce(undefined);

		const { result } = renderVisibleTree(queryClient);

		result.current.toggle("root", true);

		await waitFor(() => {
			const data = queryClient.getQueryData<{ rows: FlatNodeRow[] }>(
				visibleTreeOptions().queryKey,
			);
			expect(data?.rows.find((r) => r.id === "root")?.expanded).toBe(true);
		});

		expect(client.nodes.visibleTree).not.toHaveBeenCalled();
		expect(client.nodes.toggleExpanded).toHaveBeenCalledWith({
			id: "root",
			expanded: true,
		});
	});

	it("patches expanded to false on collapse", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions().queryKey, {
			rows: [{ ...root, expanded: true }, child("c1", "a0")],
		});
		vi.mocked(client.nodes.toggleExpanded).mockResolvedValueOnce(undefined);

		const { result } = renderVisibleTree(queryClient);

		result.current.toggle("root", false);

		await waitFor(() => {
			const data = queryClient.getQueryData<{ rows: FlatNodeRow[] }>(
				visibleTreeOptions().queryKey,
			);
			expect(data?.rows.find((r) => r.id === "root")?.expanded).toBe(false);
		});
	});
});
