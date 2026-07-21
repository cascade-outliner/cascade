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
			create: vi.fn(),
			updateContent: vi.fn(),
			setDueDate: vi.fn(),
			move: vi.fn(),
			toggleExpanded: vi.fn(),
			visibleTree: vi.fn(),
		},
	},
	orpc: {
		nodes: {
			visibleTree: {
				queryOptions: vi.fn(),
				key: vi.fn(() => ["nodes", "visibleTree"]),
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
	dueDateRange: { start: Date; end: Date } | null = null,
) {
	return renderHook(
		() => useVisibleTree(null, includeCollapsedDescendants, dueDateRange),
		{
			wrapper: ({ children }) => (
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			),
		},
	);
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
		const date = new Date(2026, 6, 21);

		renderVisibleTree(queryClient, true, { start: date, end: date });

		expect(orpc.nodes.visibleTree.queryOptions).toHaveBeenCalledWith({
			input: {
				rootId: null,
				includeCollapsedDescendants: true,
				dueDateStart: "2026-07-21",
				dueDateEnd: "2026-07-21",
			},
		});
	});

	it("patches expanded state locally when toggling in filtered mode", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions(null, true).queryKey, {
			rows: [{ ...row, expanded: true, hasChildren: true }],
			nextCursor: null,
		});
		vi.mocked(client.nodes.toggleExpanded).mockResolvedValueOnce(undefined);

		const { result } = renderVisibleTree(queryClient, true);

		result.current.toggle("node-1", false);

		await waitFor(() => {
			expect(
				queryClient.getQueryData(visibleTreeOptions(null, true).queryKey),
			).toEqual({
				rows: [{ ...row, expanded: false, hasChildren: true }],
				nextCursor: null,
			});
		});
	});

	it("invalidates every tree variant after saving a due date", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions(null).queryKey, {
			rows: [row],
			nextCursor: null,
		});
		queryClient.setQueryData(visibleTreeOptions(null, true).queryKey, {
			rows: [row],
			nextCursor: null,
		});
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		vi.mocked(client.nodes.setDueDate).mockResolvedValueOnce(undefined);

		const { result } = renderVisibleTree(queryClient);

		result.current.setDueDate("node-1", new Date(2026, 6, 21));

		await waitFor(() => expect(queryClient.isMutating()).toBe(0));
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["nodes", "visibleTree"],
		});
		expect(
			queryClient.getQueryState(visibleTreeOptions(null, true).queryKey)
				?.isInvalidated,
		).toBe(true);
	});
});

describe("useVisibleTree.move", () => {
	const queryKey = ["nodes", "visibleTree", { input: { rootId: null } }];
	const nextCursor = ["b0"];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(orpc.nodes.visibleTree.queryOptions).mockReturnValue({
			queryKey,
			queryFn: () => Promise.resolve({ rows: [row], nextCursor: null }),
		} as never);
	});

	it("does not invalidate (and so keeps loadMore-accumulated rows) when the move succeeds", async () => {
		const queryClient = new QueryClient();
		const loadedMore: VisibleNodeRow = { ...row, id: "node-2", order: "b0" };
		queryClient.setQueryData(visibleTreeOptions(null).queryKey, {
			rows: [row, loadedMore],
			nextCursor: null,
		});
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		vi.mocked(client.nodes.move).mockResolvedValueOnce(undefined as never);

		const { result } = renderVisibleTree(queryClient);

		result.current.move("node-1", { position: "append", parentId: null });

		await waitFor(() => expect(queryClient.isMutating()).toBe(0));

		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(
			queryClient.getQueryData<{ rows: VisibleNodeRow[] }>(
				visibleTreeOptions(null).queryKey,
			)?.rows,
		).toHaveLength(2);
	});

	it("invalidates to reconcile when the move fails", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions(null).queryKey, {
			rows: [row],
			nextCursor,
		});
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		vi.mocked(client.nodes.move).mockRejectedValueOnce(new Error("conflict"));

		const { result } = renderVisibleTree(queryClient);

		result.current.move("node-1", { position: "append", parentId: null });

		await waitFor(() =>
			expect(invalidateSpy).toHaveBeenCalledWith({ queryKey }),
		);
	});
});

describe("useVisibleTree.add/addAfter", () => {
	const created = {
		id: "node-2",
		parentId: null,
		content: null,
		type: "text" as const,
		metadata: null,
		expanded: false,
		order: "b0",
		dueDate: null,
		tags: [],
		hasChildren: false,
	};

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

	it("appends the created row and returns its id on success", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions(null).queryKey, {
			rows: [row],
			nextCursor: null,
		});
		vi.mocked(client.nodes.create).mockResolvedValueOnce(created);

		const { result } = renderVisibleTree(queryClient);

		let newId: string | null = null;
		await result.current.add().then((id) => {
			newId = id;
		});

		expect(newId).toBe("node-2");
		expect(toast.error).not.toHaveBeenCalled();
		expect(
			queryClient.getQueryData<{ rows: VisibleNodeRow[] }>(
				visibleTreeOptions(null).queryKey,
			)?.rows,
		).toHaveLength(2);
	});

	it("shows an error toast and returns null when the create fails, without touching the cache", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions(null).queryKey, {
			rows: [row],
			nextCursor: null,
		});
		vi.mocked(client.nodes.create).mockRejectedValueOnce(new Error("boom"));

		const { result } = renderVisibleTree(queryClient);

		let newId: string | null = "unset" as unknown as string | null;
		await result.current.add().then((id) => {
			newId = id;
		});

		expect(newId).toBeNull();
		expect(toast.error).toHaveBeenCalledWith(m.node_create_failed());
		expect(
			queryClient.getQueryData<{ rows: VisibleNodeRow[] }>(
				visibleTreeOptions(null).queryKey,
			)?.rows,
		).toEqual([row]);
	});

	it("addAfter reads the sibling from the live cache instead of the stale render snapshot", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions(null).queryKey, {
			rows: [row],
			nextCursor: null,
		});
		const { result, rerender } = renderVisibleTree(queryClient);

		// A concurrent change updates the sibling's depth in the cache after
		// this hook instance was rendered with the original `row`.
		queryClient.setQueryData(visibleTreeOptions(null).queryKey, {
			rows: [{ ...row, depth: 3 }],
			nextCursor: null,
		});
		rerender();

		vi.mocked(client.nodes.create).mockResolvedValueOnce({
			...created,
			parentId: row.parentId,
		});

		await result.current.addAfter("node-1");

		expect(client.nodes.create).toHaveBeenCalledWith(
			expect.objectContaining({ parentId: row.parentId, afterId: "node-1" }),
		);
		expect(
			queryClient.getQueryData<{ rows: VisibleNodeRow[] }>(
				visibleTreeOptions(null).queryKey,
			)?.rows?.[1],
		).toMatchObject({ depth: 3 });
	});
});
