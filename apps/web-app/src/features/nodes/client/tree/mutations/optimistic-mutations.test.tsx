// @vitest-environment jsdom
import { buildVisibleTree } from "@cascade/outliner/build-visible-tree";
import type { FlatNodeRow } from "@cascade/outliner/node-types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { generateKeyBetween } from "fractional-indexing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	COMPLETED_EXIT_DURATION_MS,
	COMPLETED_HIDE_DELAY_MS,
} from "@/features/nodes/client/filters/use-delayed-completion-hide";
import { client } from "@/orpc/client";
import type { VisibleTreeData } from "../tree-data.types";
import { useDuplicateMutation } from "./use-duplicate-node";
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

// Real fractional-index keys (not the row's id), since moving a row computes
// an actual order between real siblings via `fractional-indexing`.
let lastOrder: string | null = null;
function row(
	id: string,
	parentId: string | null,
	overrides: Partial<FlatNodeRow> = {},
): FlatNodeRow {
	lastOrder = generateKeyBetween(lastOrder, null);
	return {
		id,
		parentId,
		content: null,
		type: "text",
		metadata: null,
		expanded: true,
		order: lastOrder,
		dueDate: null,
		dueTime: null,
		recurrence: null,
		tags: [],
		icon: null,
		...overrides,
	};
}

function setup(rows: FlatNodeRow[] = [row("node", null)]) {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	});
	queryClient.setQueryData<VisibleTreeData>(queryKey, { rows });
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return { queryClient, wrapper };
}

function cachedRows(queryClient: QueryClient) {
	return queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows ?? [];
}

/** The rendered view move/remove capture undo/target positions from. */
function view(rows: FlatNodeRow[]) {
	return buildVisibleTree(rows, null, { includeCollapsed: true });
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

	it("patches content", async () => {
		const { queryClient, wrapper } = setup();
		const { result } = renderHook(() => useUpdateContentMutation(queryKey), {
			wrapper,
		});
		const content = { root: { children: ["updated"] } };

		result.current("node", content);
		await waitForPatch(queryClient);

		expect(cachedRows(queryClient)[0]?.content).toEqual(content);
	});

	it("patches type, tags, due date, and recurrence semantics", async () => {
		const initial = row("node", null, {
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

		dueDate.result.current("node", new Date(2026, 6, 31), null);
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
			row("node", null, {
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
				row("node", null, { type: "task", metadata: { completed: false } }),
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
			row("node", null, { type: "task", metadata: { completed: true } }),
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

	it("toggles expanded without dropping descendants from the shared cache", async () => {
		const rows = [row("parent", null), row("child", "parent")];
		const { queryClient, wrapper } = setup(rows);
		const { result } = renderHook(() => useToggleMutation(queryKey), {
			wrapper,
		});

		result.current("parent", false);
		await waitForPatch(queryClient);

		// The child row stays in the shared raw cache — collapse only hides it
		// from the rendered view (buildVisibleTree), computed separately.
		expect(cachedRows(queryClient).map(({ id }) => id)).toEqual([
			"parent",
			"child",
		]);
		expect(cachedRows(queryClient)[0]?.expanded).toBe(false);
	});

	it("moves a node to a new parent", async () => {
		const rows = [
			row("root", null),
			row("source", "root"),
			row("child", "source"),
			row("target", null),
		];
		const { queryClient, wrapper } = setup(rows);
		const { result } = renderHook(() => useMoveMutation(queryKey, view(rows)), {
			wrapper,
		});

		const succeeded = await result.current("source", {
			position: "append",
			parentId: "target",
		});
		await waitForPatch(queryClient);

		expect(succeeded).toBe(true);
		const moved = cachedRows(queryClient).find(({ id }) => id === "source");
		expect(moved?.parentId).toBe("target");
		// The child's own parentId is untouched by a move of its ancestor.
		expect(
			cachedRows(queryClient).find(({ id }) => id === "child")?.parentId,
		).toBe("source");
	});

	it("reports a failed move without rejecting the drag-and-drop flow", async () => {
		const rows = [row("source", null), row("target", null)];
		const { wrapper } = setup(rows);
		vi.mocked(client.nodes.move).mockRejectedValueOnce(
			new Error("move failed"),
		);
		const { result } = renderHook(() => useMoveMutation(queryKey, view(rows)), {
			wrapper,
		});

		await expect(
			result.current("source", {
				position: "after",
				targetId: "target",
				parentId: null,
			}),
		).resolves.toBe(false);
	});

	it("removes a leaf subtree before the delete settles", async () => {
		const rows = [row("root", null), row("child", "root")];
		const { queryClient, wrapper } = setup(rows);
		const { result } = renderHook(
			() => useRemoveMutation(queryKey, view(rows)),
			{ wrapper },
		);

		result.current("child");
		await waitFor(() => expect(client.nodes.delete).toHaveBeenCalled());

		expect(cachedRows(queryClient).map(({ id }) => id)).toEqual(["root"]);
	});

	it("refetches the tree after duplicating a node", async () => {
		const rows = [row("source", null), row("later", null)];
		const { queryClient, wrapper } = setup(rows);
		vi.mocked(client.nodes.duplicate).mockResolvedValue({
			id: "copy",
			parentId: null,
			content: null,
			type: "text",
			metadata: null,
			expanded: false,
			order: "copy",
			dueDate: null,
			dueTime: null,
			recurrence: null,
			priority: null,
			status: null,
			tags: [],
			icon: null,
			isBoard: false,
			hasChildren: false,
		});
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
		const { result } = renderHook(() => useDuplicateMutation(queryKey), {
			wrapper,
		});

		await result.current("source");

		expect(client.nodes.duplicate).toHaveBeenCalledWith({ id: "source" });
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey });
	});
});
