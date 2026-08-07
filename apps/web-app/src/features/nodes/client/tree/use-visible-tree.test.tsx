// @vitest-environment jsdom
import type { FlatNodeRow } from "@cascade/outliner/node-types";
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
			setIcon: vi.fn(),
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

const row: FlatNodeRow = {
	id: "node-1",
	parentId: null,
	content: { root: { type: "root", children: [] } },
	type: "text",
	metadata: null,
	expanded: false,
	order: "a0",
	dueDate: null,
	dueTime: null,
	recurrence: null,
	tags: [],
	icon: null,
};

const queryKey = ["nodes", "visibleTree"];

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
		vi.mocked(orpc.nodes.visibleTree.queryOptions).mockReturnValue({
			queryKey,
			queryFn: () => Promise.resolve({ rows: [row] }),
		} as never);
	});

	it("shows an error toast and reverts when the server rejects the update", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions().queryKey, { rows: [row] });
		vi.mocked(client.nodes.updateContent).mockRejectedValueOnce(
			new Error("input validation failed"),
		);

		const { result } = renderVisibleTree(queryClient);

		const succeeded = await result.current.updateContent("node-1", {
			root: { type: "root", children: [] },
		});

		expect(succeeded).toBe(false);
		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(m.node_save_failed());
		});
	});

	it("does not show an error toast when the update succeeds", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions().queryKey, { rows: [row] });
		vi.mocked(client.nodes.updateContent).mockResolvedValueOnce(undefined);

		const { result } = renderVisibleTree(queryClient);

		const succeeded = await result.current.updateContent("node-1", {
			root: { type: "root", children: [] },
		});

		expect(succeeded).toBe(true);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it("patches expanded state locally when toggling", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions().queryKey, {
			rows: [{ ...row, expanded: true }],
		});
		vi.mocked(client.nodes.toggleExpanded).mockResolvedValueOnce(undefined);

		const { result } = renderVisibleTree(queryClient);

		result.current.toggle("node-1", false);

		await waitFor(() => {
			expect(queryClient.getQueryData(visibleTreeOptions().queryKey)).toEqual({
				rows: [{ ...row, expanded: false }],
			});
		});
	});

	it("invalidates the shared tree cache after saving a due date", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions().queryKey, { rows: [row] });
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		vi.mocked(client.nodes.setDueDate).mockResolvedValueOnce(undefined);

		const { result } = renderVisibleTree(queryClient);

		result.current.setDueDate("node-1", new Date(2026, 6, 21), null);

		await waitFor(() => expect(queryClient.isMutating()).toBe(0));
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["nodes", "visibleTree"],
		});
	});
});

describe("useVisibleTree.move", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(orpc.nodes.visibleTree.queryOptions).mockReturnValue({
			queryKey,
			queryFn: () => Promise.resolve({ rows: [row] }),
		} as never);
	});

	it("does not invalidate when the move succeeds", async () => {
		const queryClient = new QueryClient();
		const secondRow: FlatNodeRow = { ...row, id: "node-2", order: "a1" };
		queryClient.setQueryData(visibleTreeOptions().queryKey, {
			rows: [row, secondRow],
		});
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		vi.mocked(client.nodes.move).mockResolvedValueOnce(undefined as never);

		const { result } = renderVisibleTree(queryClient);

		result.current.move("node-1", { position: "append", parentId: null });

		await waitFor(() => expect(queryClient.isMutating()).toBe(0));

		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(
			queryClient.getQueryData<{ rows: FlatNodeRow[] }>(
				visibleTreeOptions().queryKey,
			)?.rows,
		).toHaveLength(2);
	});

	it("invalidates to reconcile when the move fails", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions().queryKey, { rows: [row] });
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
		dueTime: null,
		recurrence: null,
		priority: null,
		status: null,
		tags: [],
		icon: null,
		isBoard: false,
		parentIsBoard: false,
		hasChildren: false,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(orpc.nodes.visibleTree.queryOptions).mockReturnValue({
			queryKey,
			queryFn: () => Promise.resolve({ rows: [row] }),
		} as never);
	});

	it("appends the created row and returns its id on success", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions().queryKey, { rows: [row] });
		vi.mocked(client.nodes.create).mockResolvedValueOnce(created);

		const { result } = renderVisibleTree(queryClient);

		let newId: string | null = null;
		await result.current.add().then((id) => {
			newId = id;
		});

		expect(newId).toBe("node-2");
		expect(toast.error).not.toHaveBeenCalled();
		expect(
			queryClient.getQueryData<{ rows: FlatNodeRow[] }>(
				visibleTreeOptions().queryKey,
			)?.rows,
		).toHaveLength(2);
	});

	it("shows an error toast and returns null when the create fails, without touching the cache", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions().queryKey, { rows: [row] });
		vi.mocked(client.nodes.create).mockRejectedValueOnce(new Error("boom"));

		const { result } = renderVisibleTree(queryClient);

		let newId: string | null = "unset" as unknown as string | null;
		await result.current.add().then((id) => {
			newId = id;
		});

		expect(newId).toBeNull();
		expect(toast.error).toHaveBeenCalledWith(m.node_create_failed());
		expect(
			queryClient.getQueryData<{ rows: FlatNodeRow[] }>(
				visibleTreeOptions().queryKey,
			)?.rows,
		).toEqual([row]);
	});

	it("addAfter reads the sibling from the live cache instead of the stale render snapshot", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions().queryKey, { rows: [row] });
		const { result, rerender } = renderVisibleTree(queryClient);

		// A concurrent change updates the sibling's expanded state in the cache
		// after this hook instance was rendered with the original `row`.
		queryClient.setQueryData(visibleTreeOptions().queryKey, {
			rows: [{ ...row, expanded: true }],
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
			queryClient.getQueryData<{ rows: FlatNodeRow[] }>(
				visibleTreeOptions().queryKey,
			)?.rows?.[0],
		).toMatchObject({ expanded: true });
	});

	it("passes a requested node conversion through creation", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(visibleTreeOptions().queryKey, { rows: [row] });
		vi.mocked(client.nodes.create).mockResolvedValueOnce({
			...created,
			type: "task",
			metadata: { completed: false },
		});
		const { result } = renderVisibleTree(queryClient);

		await result.current.addAfter("node-1", {
			initialType: { type: "task", metadata: { completed: false } },
		});

		expect(client.nodes.create).toHaveBeenCalledWith(
			expect.objectContaining({
				initialType: { type: "task", metadata: { completed: false } },
			}),
		);
	});
});
