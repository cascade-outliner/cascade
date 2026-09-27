import { colors, fontSize, space } from "@cascade/theme/tokens.stylex";
import { CircleNotchIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useSyncExternalStore } from "react";

const fadeIn = stylex.keyframes({
	from: { opacity: 0 },
});

const spin = stylex.keyframes({
	to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
	root: {
		position: "fixed",
		inset: 0,
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		gap: space["3"],
		backgroundColor: colors.canvas,
		color: colors.muted,
		fontSize: fontSize["700"],
	},
	// Fast loads never show the spinner; slow ones fade it in.
	content: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: space["5"],
		animationName: fadeIn,
		animationDuration: "200ms",
		animationDelay: "300ms",
		animationFillMode: "backwards",
	},
	icon: {
		fontSize: "56px",
		color: colors.primary,
		animationName: spin,
		animationDuration: "0.9s",
		animationIterationCount: "infinite",
		animationTimingFunction: "linear",
		"@media (prefers-reduced-motion: reduce)": {
			animationName: "none",
		},
	},
});

/** Covers the page until the outline is loaded and the first sync settled. */
export function LoadingScreen() {
	return (
		<div {...stylex.props(styles.root)} role="status" aria-live="polite">
			<div {...stylex.props(styles.content)}>
				<CircleNotchIcon {...stylex.props(styles.icon)} aria-hidden />
				Loading your outline…
			</div>
		</div>
	);
}

// One loader for the whole boot: the shell renders it until the page that owns
// loading (the outline, or not-found) clears this flag. Starting `true` covers
// the gap while the lazy route chunk loads, so the loader never remounts (which pops).
let appLoading = true;
const listeners = new Set<() => void>();

export function setAppLoading(loading: boolean): void {
	appLoading = loading;
	for (const listener of listeners) listener();
}

export function useAppLoading(): boolean {
	return useSyncExternalStore(
		(listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		() => appLoading,
		() => true,
	);
}
