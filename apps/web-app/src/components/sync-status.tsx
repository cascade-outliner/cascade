import { observer } from "mobx-react-lite";
import { useSyncClient } from "#/lib/outline-store.tsx";

const LABELS = {
	idle: "Offline",
	bootstrapping: "Loading…",
	ready: "Synced",
	offline: "Reconnecting…",
	error: "Sync error",
} as const;

export const SyncStatus = observer(function SyncStatus() {
	const sync = useSyncClient();
	const pending = sync.pendingCount;
	const label =
		sync.status === "ready" && pending > 0
			? `Saving ${pending}…`
			: LABELS[sync.status];

	return (
		<span
			className="text-muted text-sm"
			title={sync.lastError ?? `lastSyncId ${sync.lastSyncId}`}
		>
			{label}
		</span>
	);
});
