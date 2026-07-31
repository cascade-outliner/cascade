// @vitest-environment jsdom
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	COMPLETED_EXIT_DURATION_MS,
	COMPLETED_HIDE_DELAY_MS,
} from "@/features/nodes/client/filters/use-delayed-completion-hide";
import { client } from "@/orpc/client";
import type { VisibleTreeData } from "../tree-data.types";
import { useDuplicateMutation } from "./use-duplicate-node";
import { useLoadMoreMutation } from "./use-load-more-nodes";
import { useMoveMutation } from "./use-move-node";
import { useRemoveMutation } from "./use-remove-node";
import { useSetDueDateMutation } from "./use-set-node-due-date";
import { useSetRecurrenceMutation } from "./use-set-node-recurrence";
import { useSetTagsMutation } from "./use-set-node-tags";
import { useSetTypeMutation } from "./use-set-node-type";
import { useSetTaskCompletedMutation } from "./use-set-task-completed";
import { useToggleMutation } from "./use-toggle-node";
import { useUpdateContentMutation } from "./use-update-node-content";

vi.mock("@/orpc/client", () => ({
	client: {
		nodes: {
			delete: vi.fn(),
			duplicate: vi.fn(),
			move: vi.fn(),
			setDueDate: vi.fn(),
			setRecurrence: vi.fn(),
			setTags: vi.fn(),
			setType: vi.fn(),
			setTaskCompleted: vi.fn(),
			toggleExpanded: vi.fn(),
			updateContent: vi.fn(),
			visibleTree: vi.fn(),
		},
	},
	orpc: {
		nodes: {
			ancestors: { key: vi.fn(() => ["nodes", "ancestors"]) },
			visibleTree: { key: vi.fn(() => ["nodes", "visibleTree"]) },
		},
	},
}));

vi.mock("@cascade/ui/toast", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
		promise: vi.fn((promise: Promise<unknown>) => promise),
	},
}));

const queryKey = ["nodes", "visibleTree", "optimistic"];

function row(
	id: string,
	parentId: string | null,
	depth: number,
	path: string[],
	overrides: Partial<VisibleNodeRow> = {},
): VisibleNodeRow {
	return {
		id,
		parentId,
		content: null,
		type: "text",
		metadata: null,
		expanded: true,
		order: id,
		dueDate: null,
		recurrence: null,
		tags: [],
		depth,
		path,
		hasChildren: false,
		isLastChild: true,
		...overrides,
	};
}

function setup(rows = [row("node", null, 0, ["node"])]) {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	});
	queryClient.setQueryData<VisibleTreeData>(queryKey, {
		rows,
		nextCursor: ["next"],
	});
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return { queryClient, wrapper };
}

function cachedRows(queryClient: QueryClient) {
	return queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows ?? [];
}

async function waitForPatch(queryClient: QueryClient) {
	await waitFor(() => expect(queryClient.isMutating()).toBe(0));
}

describe("optimistic node mutations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		for (const mutation of [
			client.nodes.delete,
			client.nodes.move,
			client.nodes.setDueDate,
			client.nodes.setRecurrence,
			client.nodes.setTags,
			client.nodes.setType,
			client.nodes.setTaskCompleted,
			client.nodes.toggleExpanded,
			client.nodes.updateContent,
		]) {
			vi.mocked(mutation).mockResolvedValue(undefined as never);
		}
		vi.mocked(client.nodes.delete).mockResolvedValue({ childrenDeleted: 0 });
		vi.mocked(client.nodes.setTaskCompleted).mockResolvedValue({
			advanced: false,
			nextDueDate: null,
		});
	});

	it("patches content while preserving pagination state", async () => {
		const { queryClient, wrapper } = setup();
		const { result } = renderHook(() => useUpdateContentMutation(queryKey), {
			wrapper,
		});
		const content = { root: { children: ["updated"] } };

		result.current("node", content);
		await waitForPatch(queryClient);

		expect(cachedRows(queryClient)[0]?.content).toEqual(content);
		expect(
			queryClient.getQueryData<VisibleTreeData>(queryKey)?.nextCursor,
		).toEqual(["next"]);
	});

	it("patches type, tags, due date, and recurrence semantics", async () => {
		const initial = row("node", null, 0, ["node"], {
			type: "task",
			metadata: { completed: true },
			dueDate: "2026-07-27",
			recurrence: { unit: "month", interval: 1, anchorDay: 27 },
		});
		const { queryClient, wrapper } = setup([initial]);
		const type = renderHook(() => useSetTypeMutation(queryKey), { wrapper });
		const tags = renderHook(() => useSetTagsMutation(queryKey), { wrapper });
		const dueDate = renderHook(() => useSetDueDateMutation(queryKey), {
			wrapper,
		});
		const recurrence = renderHook(() => useSetRecurrenceMutation(queryKey), {
			wrapper,
		});

		type.result.current("node", { type: "text", metadata: null });
		await waitForPatch(queryClient);
		expect(cachedRows(queryClient)[0]).toMatchObject({
			type: "text",
			metadata: null,
			recurrence: null,
		});

		tags.result.current("node", ["urgent", "work"]);
		await waitForPatch(queryClient);
		expect(cachedRows(queryClient)[0]?.tags).toEqual(["urgent", "work"]);

		dueDate.result.current("node", new Date(2026, 6, 31));
		await waitForPatch(queryClient);
		expect(cachedRows(queryClient)[0]?.dueDate).toBe("2026-07-31");

		recurrence.result.current("node", { unit: "month", interval: 2 });
		await waitForPatch(queryClient);
		expect(cachedRows(queryClient)[0]?.recurrence).toEqual({
			unit: "month",
			interval: 2,
			anchorDay: 31,
		});
	});

	it("patches ordinary task completion without changing its due date", async () => {
		const { queryClient, wrapper } = setup([
			row("node", null, 0, ["node"], {
				type: "task",
				metadata: { completed: false },
				dueDate: "2026-07-30",
			}),
		]);
		const { result } = renderHook(() => useSetTaskCompletedMutation(queryKey), {
			wrapper,
		});

		result.current("node", true, "2026-07-30");
		await waitForPatch(queryClient);

		expect(cachedRows(queryClient)[0]).toMatchObject({
			metadata: { completed: true },
			dueDate: "2026-07-30",
		});
	});

	it("defers invalidating visibleTree until the completion grace period elapses", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		try {
			const { queryClient, wrapper } = setup([
				row("node", null, 0, ["node"], {
					type: "task",
					metadata: { completed: false },
				}),
			]);
			const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
			const { result } = renderHook(
				() => useSetTaskCompletedMutation(queryKey),
				{ wrapper },
			);

			result.current("node", true, null);
			await waitForPatch(queryClient);

			expect(invalidateSpy).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(
				COMPLETED_HIDE_DELAY_MS + COMPLETED_EXIT_DURATION_MS,
			);

			expect(invalidateSpy).toHaveBeenCalledWith({
				queryKey: ["nodes", "visibleTree"],
			});
		} finally {
			vi.useRealTimers();
		}
	});

	it("invalidates visibleTree immediately when un-completing a task", async () => {
		const { queryClient, wrapper } = setup([
			row("node", null, 0, ["node"], {
				type: "task",
				metadata: { completed: true },
			}),
		]);
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		const { result } = renderHook(() => useSetTaskCompletedMutation(queryKey), {
			wrapper,
		});

		result.current("node", false, null);
		await waitForPatch(queryClient);

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["nodes", "visibleTree"],
		});
	});

	it("collapses visible descendants and keeps collapsed descendants in filtered mode", async () => {
		const rows = [
			row("parent", null, 0, ["parent"], { hasChildren: true }),
			row("child", "parent", 1, ["parent", "child"]),
		];
		const normal = setup(rows);
		const normalHook = renderHook(() => useToggleMutation(queryKey, false), {
			wrapper: normal.wrapper,
		});

		normalHook.result.current("parent", false);
		await waitForPatch(normal.queryClient);
		expect(cachedRows(normal.queryClient).map(({ id }) => id)).toEqual([
			"parent",
		]);

		const filtered = setup(rows);
		const filteredHook = renderHook(() => useToggleMutation(queryKey, true), {
			wrapper: filtered.wrapper,
		});
		filteredHook.result.current("parent", false);
		await waitForPatch(filtered.queryClient);
		expect(cachedRows(filtered.queryClient).map(({ id }) => id)).toEqual([
			"parent",
			"child",
		]);
		expect(cachedRows(filtered.queryClient)[0]?.expanded).toBe(false);
	});

	it("moves a subtree and repairs cached depth, path, and sibling tails", async () => {
		const { queryClient, wrapper } = setup([
			row("root", null, 0, ["root"], { hasChildren: true }),
			row("source", "root", 1, ["root", "source"], {
				hasChildren: true,
			}),
			row("child", "source", 2, ["root", "source", "child"]),
			row("target", null, 0, ["target"], { hasChildren: true }),
		]);
		const { result } = renderHook(() => useMoveMutation(queryKey), { wrapper });

		const succeeded = await result.current("source", {
			position: "append",
			parentId: "target",
		});
		await waitForPatch(queryClient);

		expect(succeeded).toBe(true);
		expect(cachedRows(queryClient).map(({ id }) => id)).toEqual([
			"root",
			"target",
			"source",
			"child",
		]);
		expect(
			cachedRows(queryClient).find(({ id }) => id === "source"),
		).toMatchObject({
			parentId: "target",
			depth: 1,
			path: ["target", "source"],
		});
		expect(
			cachedRows(queryClient).find(({ id }) => id === "child"),
		).toMatchObject({
			depth: 2,
			path: ["target", "source", "child"],
		});
		expect(
			cachedRows(queryClient).find(({ id }) => id === "root"),
		).toMatchObject({
			hasChildren: false,
			expanded: false,
		});
	});

	it("reports a failed move without rejecting the drag-and-drop flow", async () => {
		const { wrapper } = setup([
			row("source", null, 0, ["source"]),
			row("target", null, 0, ["target"]),
		]);
		vi.mocked(client.nodes.move).mockRejectedValueOnce(
			new Error("move failed"),
		);
		const { result } = renderHook(() => useMoveMutation(queryKey), { wrapper });

		await expect(
			result.current("source", {
				position: "after",
				targetId: "target",
				parentId: null,
			}),
		).resolves.toBe(false);
	});

	it("removes a leaf subtree before the delete settles", async () => {
		const { queryClient, wrapper } = setup([
			row("root", null, 0, ["root"], { hasChildren: true }),
			row("child", "root", 1, ["root", "child"]),
		]);
		const { result } = renderHook(() => useRemoveMutation(queryKey), {
			wrapper,
		});

		result.current("child");
		await waitFor(() => expect(client.nodes.delete).toHaveBeenCalled());

		expect(cachedRows(queryClient).map(({ id }) => id)).toEqual(["root"]);
		expect(cachedRows(queryClient)[0]).toMatchObject({
			hasChildren: false,
			expanded: false,
		});
	});

	it("inserts a duplicated leaf after its source", async () => {
		const { queryClient, wrapper } = setup([
			row("source", null, 0, ["source"]),
			row("later", null, 0, ["later"]),
		]);
		vi.mocked(client.nodes.duplicate).mockResolvedValue({
			id: "copy",
			parentId: null,
			content: null,
			type: "text",
			metadata: null,
			expanded: false,
			order: "copy",
			dueDate: null,
			recurrence: null,
			tags: [],
			hasChildren: false,
		});
		const { result } = renderHook(() => useDuplicateMutation(queryKey), {
			wrapper,
		});

		await result.current("source");

		expect(cachedRows(queryClient).map(({ id }) => id)).toEqual([
			"source",
			"copy",
			"later",
		]);
		expect(
			cachedRows(queryClient).find(({ id }) => id === "copy"),
		).toMatchObject({
			depth: 0,
			path: ["copy"],
		});
	});

	it("appends a loaded page and advances the cursor", async () => {
		const { queryClient, wrapper } = setup([row("first", null, 0, ["first"])]);
		vi.mocked(client.nodes.visibleTree).mockResolvedValue({
			rows: [row("second", null, 0, ["second"])],
			nextCursor: null,
		});
		const { result } = renderHook(
			() => useLoadMoreMutation(queryKey, null, false, null, false, ["next"]),
			{ wrapper },
		);

		await result.current();

		expect(cachedRows(queryClient).map(({ id }) => id)).toEqual([
			"first",
			"second",
		]);
		expect(
			queryClient.getQueryData<VisibleTreeData>(queryKey)?.nextCursor,
		).toBeNull();
	});
});
