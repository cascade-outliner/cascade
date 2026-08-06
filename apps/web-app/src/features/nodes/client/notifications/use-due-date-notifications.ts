import { combineDueDateTime } from "@cascade/outliner/calendar-time";
import { toast } from "@cascade/ui/toast";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { m } from "#/paraglide/messages.js";
import { useSettings } from "@/features/settings/client/settings-context";
import { orpc } from "@/orpc/client";

const POLL_INTERVAL_MS = 15 * 60_000;

interface DueSoonTask {
	id: string;
	slug: string;
	label: string;
	dueDate: string;
	dueTime: string;
}

interface ScheduledEntry {
	timeoutId: ReturnType<typeof setTimeout>;
	dueDate: string;
	dueTime: string;
}

/**
 * Schedules an in-app toast (and, with browser permission, an OS
 * notification) for the exact instant each of the user's upcoming due tasks
 * becomes due — while this tab is open (see #599). There's no push
 * infrastructure yet, so this only fires while the app is running; a task
 * whose due time already passed by the time `listDueSoon` is (re)fetched
 * still fires once, immediately, as a one-time catch-up.
 */
export function useDueDateNotifications() {
	const { settings } = useSettings();
	const enabled = settings.dueDateNotificationsEnabled;
	const enabledRef = useRef(enabled);
	enabledRef.current = enabled;
	const router = useRouter();
	const scheduledRef = useRef(new Map<string, ScheduledEntry>());

	const { data } = useQuery({
		...orpc.nodes.listDueSoon.queryOptions(),
		enabled,
		refetchInterval: POLL_INTERVAL_MS,
		refetchOnWindowFocus: true,
	});

	useEffect(() => {
		const scheduled = scheduledRef.current;

		if (!enabled || !data) {
			for (const entry of scheduled.values()) clearTimeout(entry.timeoutId);
			scheduled.clear();
			return;
		}

		const tasks = data.tasks as DueSoonTask[];
		const seenIds = new Set(tasks.map((task) => task.id));
		for (const [id, entry] of scheduled) {
			if (!seenIds.has(id)) {
				clearTimeout(entry.timeoutId);
				scheduled.delete(id);
			}
		}

		for (const task of tasks) {
			const existing = scheduled.get(task.id);
			if (
				existing &&
				existing.dueDate === task.dueDate &&
				existing.dueTime === task.dueTime
			) {
				continue;
			}
			if (existing) clearTimeout(existing.timeoutId);

			const fireAt = combineDueDateTime(task.dueDate, task.dueTime).getTime();
			const delay = Math.max(0, fireAt - Date.now());
			const timeoutId = setTimeout(() => {
				scheduled.delete(task.id);
				if (!enabledRef.current) return;
				fireDueDateNotification(task, router);
			}, delay);
			scheduled.set(task.id, {
				timeoutId,
				dueDate: task.dueDate,
				dueTime: task.dueTime,
			});
		}
	}, [data, enabled, router]);

	// Unmount-only cleanup; the effect above already clears/reschedules on
	// every data or enabled change.
	useEffect(() => {
		const scheduled = scheduledRef.current;
		return () => {
			for (const entry of scheduled.values()) clearTimeout(entry.timeoutId);
			scheduled.clear();
		};
	}, []);
}

function fireDueDateNotification(
	task: DueSoonTask,
	router: ReturnType<typeof useRouter>,
) {
	const title = task.label || m.due_date_notification_title();
	// A due-date alert is worth acting on, not glancing past — keep it on
	// screen until the user dismisses it instead of auto-expiring.
	toast.info(title, m.due_date_notification_title(), { timeout: 0 });

	if (
		typeof Notification === "undefined" ||
		Notification.permission !== "granted"
	) {
		return;
	}
	const notification = new Notification(title, {
		body: m.due_date_notification_body(),
		tag: task.id,
	});
	notification.onclick = () => {
		window.focus();
		router.navigate({ to: "/$nodeSlug", params: { nodeSlug: task.slug } });
	};
}
