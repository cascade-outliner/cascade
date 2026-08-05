import { useDueDateNotifications } from "./use-due-date-notifications";

/** Invisible: mounts the real-time due-date notification scheduler (#599). */
export function DueDateNotificationsProvider() {
	useDueDateNotifications();
	return null;
}
