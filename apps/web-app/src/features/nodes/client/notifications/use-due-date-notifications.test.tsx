// @vitest-environment jsdom
import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import { toast } from "@cascade/ui/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDueDateNotifications } from "./use-due-date-notifications";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ navigate }),
}));

let settings = { dueDateNotificationsEnabled: true };
vi.mock("@/features/settings/client/settings-context", () => ({
	useSettings: () => ({ settings }),
}));

const listDueSoonQueryFn = vi.fn();
vi.mock("@/orpc/client", () => ({
	orpc: {
		nodes: {
			listDueSoon: {
				queryOptions: () => ({
					queryKey: ["nodes", "listDueSoon"],
					queryFn: listDueSoonQueryFn,
				}),
			},
		},
	},
}));

vi.mock("@cascade/ui/toast", () => ({
	toast: {
		info: vi.fn(),
	},
}));

function wrapper(queryClient: QueryClient) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
}

function inMinutes(minutes: number) {
	const date = new Date(Date.now() + minutes * 60_000);
	return {
		dueDate: formatCalendarDate(date),
		dueTime: `${String(date.getHours()).padStart(2, "0")}:${String(
			date.getMinutes(),
		).padStart(2, "0")}`,
	};
}

describe("useDueDateNotifications", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 6, 1, 9, 0, 0));
		settings = { dueDateNotificationsEnabled: true };
		listDueSoonQueryFn.mockReset();
		vi.mocked(toast.info).mockReset();
		navigate.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("shows a toast at the exact moment a task becomes due", async () => {
		const due = inMinutes(5);
		listDueSoonQueryFn.mockResolvedValue({
			tasks: [{ id: "task-1", slug: "task-1-abc", label: "Ship it", ...due }],
		});
		const queryClient = new QueryClient();
		renderHook(() => useDueDateNotifications(), {
			wrapper: wrapper(queryClient),
		});

		await vi.waitFor(() => expect(listDueSoonQueryFn).toHaveBeenCalled());

		expect(toast.info).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(5 * 60_000);
		expect(toast.info).toHaveBeenCalledTimes(1);
		expect(toast.info).toHaveBeenCalledWith("Ship it", expect.any(String));
	});

	it("does not schedule anything while disabled", async () => {
		settings = { dueDateNotificationsEnabled: false };
		const due = inMinutes(5);
		listDueSoonQueryFn.mockResolvedValue({
			tasks: [{ id: "task-1", slug: "task-1-abc", label: "Ship it", ...due }],
		});
		const queryClient = new QueryClient();
		renderHook(() => useDueDateNotifications(), {
			wrapper: wrapper(queryClient),
		});

		await vi.advanceTimersByTimeAsync(10 * 60_000);
		expect(listDueSoonQueryFn).not.toHaveBeenCalled();
		expect(toast.info).not.toHaveBeenCalled();
	});

	it("reschedules instead of double-firing when a task's due time changes (e.g. a recurring rollover)", async () => {
		const firstDue = inMinutes(5);
		listDueSoonQueryFn.mockResolvedValue({
			tasks: [
				{
					id: "task-1",
					slug: "task-1-abc",
					label: "Water plants",
					...firstDue,
				},
			],
		});
		const queryClient = new QueryClient();
		renderHook(() => useDueDateNotifications(), {
			wrapper: wrapper(queryClient),
		});
		await vi.waitFor(() => expect(listDueSoonQueryFn).toHaveBeenCalled());
		await act(async () => {
			await vi.advanceTimersByTimeAsync(0);
		});

		// The task's next occurrence lands further out before the original
		// timer would have fired — simulating a refetch after completion.
		const rescheduled = inMinutes(20);
		await act(async () => {
			queryClient.setQueryData(["nodes", "listDueSoon"], {
				tasks: [
					{
						id: "task-1",
						slug: "task-1-abc",
						label: "Water plants",
						...rescheduled,
					},
				],
			});
			await vi.advanceTimersByTimeAsync(0);
		});

		// Advance past the original 5-minute mark: it must not have fired.
		await vi.advanceTimersByTimeAsync(6 * 60_000);
		expect(toast.info).not.toHaveBeenCalled();

		// Advance to the rescheduled moment: it fires exactly once.
		await vi.advanceTimersByTimeAsync(15 * 60_000);
		expect(toast.info).toHaveBeenCalledTimes(1);
	});
});
