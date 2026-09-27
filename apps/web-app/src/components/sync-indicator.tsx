import { colors, fontSize, radius, space } from "@cascade/theme/tokens.stylex";
import {
	ArrowsClockwiseIcon,
	CheckIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";
import { useSyncEngine, useSyncStatus } from "#/lib/outline-store.tsx";

const spin = stylex.keyframes({
	to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
	root: {
		position: "fixed",
		top: space["3"],
		right: space["3"],
		display: "flex",
		alignItems: "center",
		gap: space["1.5"],
		paddingBlock: space["1"],
		paddingInline: space["2.5"],
		borderRadius: radius.lg,
		backgroundColor: colors.canvas,
		color: colors.muted,
		fontSize: fontSize["200"],
	},
	error: {
		color: colors.danger,
		boxShadow: `inset 0 0 0 1px ${colors.danger}`,
	},
	spinning: {
		animationName: spin,
		animationDuration: "1s",
		animationIterationCount: "infinite",
		animationTimingFunction: "linear",
		"@media (prefers-reduced-motion: reduce)": {
			animationName: "none",
		},
	},
	retry: {
		padding: 0,
		borderWidth: 0,
		backgroundColor: "transparent",
		color: "inherit",
		font: "inherit",
		fontWeight: 500,
		textDecoration: "underline",
		cursor: "pointer",
	},
});

/** Shows whether the outline reached the server. Hidden when sync isn't configured. */
export function SyncIndicator() {
	const engine = useSyncEngine();
	const syncStatus = useSyncStatus();
	// Keep showing a failure through retries until one succeeds, instead of flickering.
	const [failed, setFailed] = useState(false);
	useEffect(() => {
		if (syncStatus === "error") setFailed(true);
		if (syncStatus === "idle") setFailed(false);
	}, [syncStatus]);
	const status = failed && syncStatus === "syncing" ? "error" : syncStatus;

	if (status === "disabled") {
		return null;
	}

	const lastSynced = engine.lastSyncedAt
		? `Last synced ${new Date(engine.lastSyncedAt).toLocaleTimeString()}`
		: undefined;

	return (
		<div
			{...stylex.props(styles.root, status === "error" && styles.error)}
			role="status"
			title={lastSynced}
			data-testid="sync-indicator"
		>
			{status === "syncing" && (
				<>
					<ArrowsClockwiseIcon {...stylex.props(styles.spinning)} /> Syncing…
				</>
			)}
			{status === "idle" && (
				<>
					<CheckIcon /> Synced
				</>
			)}
			{status === "error" && (
				<>
					<WarningCircleIcon /> Sync failed, retrying.
					<button
						type="button"
						{...stylex.props(styles.retry)}
						onClick={() => void engine.sync()}
					>
						Retry now
					</button>
				</>
			)}
		</div>
	);
}
