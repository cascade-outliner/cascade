import { dayId, dayLabel, openDay, relativeDay, shiftDay } from "@cascade/data";
import {
	borderWidth,
	colors,
	fontSize,
	radius,
	space,
} from "@cascade/theme/tokens.stylex";
import { Breadcrumbs } from "@cascade/ui/outliner/breadcrumbs";
import { DaySwitcher } from "@cascade/ui/outliner/day-switcher";
import { MagnifyingGlassIcon, SignOutIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Link } from "@tanstack/react-router";
import { observer } from "mobx-react-lite";
import { openCommandMenu } from "#/components/command-menu.tsx";
import { signInWithGoogle, signOut } from "#/lib/auth-client.ts";
import { useOutlineStore, useSyncConfig } from "#/lib/outline-store.tsx";

const MOBILE = "@media (max-width: 640px)";
// Wide enough for the logo to sit left of the centered container without overlapping it.
const WIDE = "@media (min-width: 1200px)";

const styles = stylex.create({
	header: {
		position: "sticky",
		top: 0,
		zIndex: 2,
		backgroundColor: colors.canvas,
		borderBottomWidth: borderWidth.thin,
		borderBottomStyle: "solid",
		borderBottomColor: colors.border,
		// Own layer, so it holds still instead of cross-fading with the page on zoom.
		viewTransitionName: "app-header",
	},
	inner: {
		display: "flex",
		flexWrap: { default: "nowrap", [MOBILE]: "wrap" },
		alignItems: "center",
		gap: space["3"],
		rowGap: { default: null, [MOBILE]: space["2"] },
		maxWidth: 980,
		margin: "0 auto",
		paddingBlock: space["2.5"],
		paddingInline: { default: space["8"], [MOBILE]: space["4"] },
	},
	logo: {
		display: "flex",
		alignItems: "center",
		gap: space["2"],
		flexShrink: 0,
		marginInlineEnd: { default: space["3"], [MOBILE]: "auto", [WIDE]: 0 },
		position: { default: "static", [WIDE]: "absolute" },
		left: space["4"],
		top: "50%",
		transform: { default: null, [WIDE]: "translateY(-50%)" },
		borderRadius: radius.sm,
		color: colors.ink,
		fontSize: fontSize["700"],
		fontWeight: 600,
		letterSpacing: "-0.02em",
		textDecoration: "none",
	},
	logoMark: {
		flexShrink: 0,
	},
	wordmark: {
		display: { default: "inline", [MOBILE]: "none" },
	},
	// On mobile the breadcrumbs drop to their own row below; hidden there when there are none.
	start: {
		display: {
			default: "flex",
			[MOBILE]: { default: "flex", ":empty": "none" },
		},
		flex: { default: 1, [MOBILE]: "1 1 100%" },
		order: { default: null, [MOBILE]: 1 },
		minWidth: 0,
	},
	search: {
		display: "flex",
		alignItems: "center",
		gap: space["2"],
		width: { default: 240, [MOBILE]: "auto" },
		height: 32,
		paddingInline: space["2.5"],
		borderWidth: borderWidth.thin,
		borderStyle: "solid",
		borderColor: {
			default: colors.border,
			":hover": colors.borderStrong,
		},
		borderRadius: radius.md,
		backgroundColor: colors.white,
		font: "inherit",
		fontSize: fontSize["300"],
		color: colors.muted,
		cursor: "pointer",
	},
	searchLabel: {
		flex: 1,
		textAlign: "start",
		display: { default: "block", [MOBILE]: "none" },
	},
	account: {
		display: "flex",
		alignItems: "center",
		gap: space["2"],
		height: 32,
		// Mirrors the logo: pinned to the screen's right edge when there's room.
		position: { default: "static", [WIDE]: "absolute" },
		right: space["4"],
		top: "50%",
		transform: { default: null, [WIDE]: "translateY(-50%)" },
		paddingInline: space["2"],
		borderWidth: borderWidth.thin,
		borderStyle: "solid",
		borderColor: {
			default: colors.border,
			":hover": colors.borderStrong,
		},
		borderRadius: radius.md,
		backgroundColor: colors.white,
		font: "inherit",
		fontSize: fontSize["300"],
		color: colors.ink,
		cursor: "pointer",
	},
	avatar: {
		width: 20,
		height: 20,
		borderRadius: radius.full,
		backgroundColor: colors.canvas,
	},
	accountLabel: {
		display: { default: "-webkit-box", [MOBILE]: "none" },
		maxWidth: 160,
		overflow: "hidden",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 1,
	},
});

/** Sign in, or the signed-in user with a way out. Hidden when the server can't sync. */
function AccountButton() {
	const config = useSyncConfig();
	if (!config?.enabled) {
		return null;
	}
	if (!config.user) {
		return (
			<button
				type="button"
				data-testid="header-sign-in"
				onClick={() => void signInWithGoogle()}
				{...stylex.props(styles.account)}
			>
				Sign in
			</button>
		);
	}
	return (
		<button
			type="button"
			data-testid="header-sign-out"
			aria-label={`Sign out ${config.user.name}`}
			title="Sign out"
			onClick={() => void signOut()}
			{...stylex.props(styles.account)}
		>
			{config.user.image ? (
				<img
					{...stylex.props(styles.avatar)}
					src={config.user.image}
					alt=""
					referrerPolicy="no-referrer"
				/>
			) : (
				<span {...stylex.props(styles.avatar)} aria-hidden />
			)}
			<span {...stylex.props(styles.accountLabel)}>{config.user.name}</span>
			<SignOutIcon size={14} />
		</button>
	);
}

/** The app icon's three cascading bars, in theme colors so it follows dark mode. */
function LogoMark() {
	return (
		<svg
			width={24}
			height={24}
			viewBox="0 0 24 24"
			aria-hidden="true"
			{...stylex.props(styles.logoMark)}
		>
			<rect width={24} height={24} rx={6} style={{ fill: colors.primary }} />
			<g style={{ fill: colors.canvas }}>
				<rect x={4.75} y={6.75} width={12.5} height={2} rx={1} />
				<rect x={7.25} y={11} width={9.25} height={2} rx={1} />
				<rect x={9.5} y={15.25} width={6.75} height={2} rx={1} />
			</g>
		</svg>
	);
}

export interface AppHeaderProps {
	zoomedId: string | null;
	onZoomTo: (id: string | null) => void;
}

/** Top bar: where you are, search, and the day switcher. */
export const AppHeader = observer(function AppHeader({
	zoomedId,
	onZoomTo,
}: AppHeaderProps) {
	const store = useOutlineStore();
	const zoomed = zoomedId ? store.get(zoomedId) : undefined;

	return (
		<header {...stylex.props(styles.header)}>
			<div {...stylex.props(styles.inner)}>
				<Link
					to="/"
					viewTransition
					aria-label="Cascade home"
					{...stylex.props(styles.logo)}
				>
					<LogoMark />
					<span {...stylex.props(styles.wordmark)}>Cascade</span>
				</Link>
				<div {...stylex.props(styles.start)}>
					{zoomed && (
						<Breadcrumbs
							ancestors={store.ancestorsOf(zoomed.id)}
							onZoomTo={onZoomTo}
							labelOf={(node) => relativeDay(node.id) ?? undefined}
						/>
					)}
				</div>
				<DaySwitcher
					label={(zoomedId && dayLabel(zoomedId)) || "Today"}
					active={zoomedId === dayId(new Date())}
					onToday={() => onZoomTo(openDay(store, new Date()))}
					onOlder={() => onZoomTo(openDay(store, shiftDay(zoomedId, -1)))}
					onNewer={() => onZoomTo(openDay(store, shiftDay(zoomedId, 1)))}
				/>
				<button
					type="button"
					aria-label="Search"
					onClick={openCommandMenu}
					{...stylex.props(styles.search)}
				>
					<MagnifyingGlassIcon size={14} />
					<span {...stylex.props(styles.searchLabel)}>Search…</span>
				</button>
				<AccountButton />
			</div>
		</header>
	);
});
