import {
	dayDate,
	dayId,
	dayLabel,
	monthId,
	openMonth,
	openYear,
	relativeDay,
	shiftDay,
	yearId,
} from "@cascade/data";
import { DropdownMenu } from "@cascade/ui/dropdown-menu";
import { Breadcrumbs } from "@cascade/ui/outliner/breadcrumbs";
import { DaySwitcher } from "@cascade/ui/outliner/day-switcher";
import {
	PeriodStrip,
	type PeriodStripProps,
	type StripItem,
} from "@cascade/ui/outliner/period-strip";
import { MagnifyingGlassIcon, SignOutIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { observer } from "mobx-react-lite";
import { openCommandMenu } from "#/components/command-menu.tsx";
import { signInWithGoogle, signOut } from "#/lib/auth-client.ts";
import { useOutlineStore, useSyncConfig } from "#/lib/outline-store.tsx";
import { css } from "#/styled-system/css";
import { token } from "#/styled-system/tokens";

const styles = {
	header: css({
		position: "sticky",
		top: "0",
		zIndex: "sticky",
		backgroundColor: "canvas",
		borderBottomWidth: "thin",
		borderBottomStyle: "solid",
		borderBottomColor: "border",
		// Own layer, so it holds still instead of cross-fading with the page on zoom.
		viewTransitionName: "app-header",
	}),
	inner: css({
		display: "flex",
		flexWrap: { base: "nowrap", _mobile: "wrap" },
		alignItems: "center",
		gap: "3",
		rowGap: { _mobile: "2" },
		maxWidth: "page",
		marginBlock: "0",
		marginInline: "auto",
		paddingBlock: "2.5",
		paddingInline: { base: "8", _mobile: "4" },
	}),
	// `_wide`: the logo sits left of the centered container without overlapping it.
	logo: css({
		display: "flex",
		alignItems: "center",
		gap: "2",
		flexShrink: 0,
		height: "control.xl",
		marginInlineEnd: { base: "3", _mobile: "auto", _wide: "0" },
		position: { base: "static", _wide: "absolute" },
		left: "4",
		// The header also holds the period strip, so 50% would drift down; pin to the top row.
		top: "2.5",
		borderRadius: "sm",
		color: "ink",
		fontSize: "700",
		fontWeight: 600,
		letterSpacing: "-0.02em",
		textDecoration: "none",
	}),
	logoMark: css({
		flexShrink: 0,
	}),
	wordmark: css({
		display: { base: "inline", _mobile: "none" },
	}),
	// On mobile the breadcrumbs drop to their own row below; hidden there when there are none.
	start: css({
		display: {
			base: "flex",
			_mobile: { base: "flex", _empty: "none" },
		},
		flex: { base: "1", _mobile: "[1 1 100%]" },
		order: { _mobile: 1 },
		minWidth: "0",
	}),
	search: css({
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
		width: "control.xl",
		height: "control.xl",
		borderWidth: "thin",
		borderStyle: "solid",
		borderColor: "border",
		borderRadius: "md",
		backgroundColor: { base: "transparent", _hover: "inkSubtle" },
		color: "muted",
		cursor: "pointer",
	}),
	account: css({
		display: "flex",
		alignItems: "center",
		gap: "2",
		height: "control.xl",
		// Mirrors the logo: pinned to the screen's right edge when there's room.
		position: { base: "static", _wide: "absolute" },
		right: "4",
		// The header also holds the period strip, so 50% would drift down; pin to the top row.
		top: "2.5",
		paddingInline: "2",
		borderWidth: "thin",
		borderStyle: "solid",
		borderColor: {
			base: "border",
			_hover: "borderStrong",
		},
		borderRadius: "md",
		backgroundColor: "white",
		font: "inherit",
		fontSize: "300",
		color: "ink",
		cursor: "pointer",
	}),
	profile: css({
		display: "flex",
		flexShrink: 0,
		position: { base: "static", _wide: "absolute" },
		right: "4",
		top: "2.5",
		padding: "0",
		border: "none",
		borderRadius: "full",
		backgroundColor: "transparent",
		cursor: "pointer",
	}),
	avatar: css({
		width: "control.xl",
		height: "control.xl",
		borderRadius: "full",
		backgroundColor: "canvas",
	}),
};

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
				className={styles.account}
			>
				Sign in
			</button>
		);
	}
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				data-testid="header-account"
				aria-label={`Account, ${config.user.name}`}
				className={styles.profile}
			>
				{config.user.image ? (
					<img
						className={styles.avatar}
						src={config.user.image}
						alt=""
						referrerPolicy="no-referrer"
					/>
				) : (
					<span className={styles.avatar} aria-hidden />
				)}
			</DropdownMenu.Trigger>
			<DropdownMenu.Popup>
				<DropdownMenu.Label>{config.user.name}</DropdownMenu.Label>
				<DropdownMenu.Item
					icon={<SignOutIcon size={15} />}
					onClick={() => void signOut()}
				>
					<span data-testid="header-sign-out">Sign out</span>
				</DropdownMenu.Item>
			</DropdownMenu.Popup>
		</DropdownMenu.Root>
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
			className={styles.logoMark}
		>
			<rect
				width={24}
				height={24}
				rx={6}
				style={{ fill: token("colors.primary") }}
			/>
			<g style={{ fill: token("colors.canvas") }}>
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
	// ponytail: one scan per render; a dot means the day has children.
	let parents: Set<string | null> | undefined;
	const marked = (date: Date) => {
		parents ??= new Set([...store.nodes.values()].map((n) => n.parentId));
		return parents.has(dayId(date));
	};

	const has = (id: string) => {
		parents ??= new Set([...store.nodes.values()].map((n) => n.parentId));
		return parents.has(id);
	};
	// A day shows its week, a month its year's months, a year its neighbouring years.
	let strip: Omit<PeriodStripProps, "label"> | null = null;
	const period = zoomedId?.match(/^daily-(\d{4})(?:-(\d{2}))?(-\d{2})?$/);
	if (period) {
		const [, y, m, d] = period;
		const year = Number(y);
		if (d && zoomedId) {
			const date = dayDate(zoomedId);
			const index = (date.getDay() + 6) % 7;
			strip = {
				kind: "day",
				selected: index,
				onShift: (by) => onZoomTo(dayId(shiftDay(zoomedId, 7 * by))),
				items: Array.from({ length: 7 }, (_, i): StripItem => {
					const day = new Date(
						year,
						date.getMonth(),
						date.getDate() - index + i,
					);
					return {
						name: day.toLocaleDateString("en-US", { weekday: "short" }),
						label: String(day.getDate()),
						marked: has(dayId(day)),
						onPick: () => onZoomTo(dayId(day)),
					};
				}),
			};
		} else if (m) {
			strip = {
				kind: "month",
				selected: Number(m) - 1,
				onShift: (by) => onZoomTo(openMonth(store, year + by, Number(m) - 1)),
				items: Array.from(
					{ length: 12 },
					(_, i): StripItem => ({
						name: String(year),
						label: new Date(year, i).toLocaleDateString("en-US", {
							month: "short",
						}),
						marked: has(monthId(year, i)),
						onPick: () => onZoomTo(openMonth(store, year, i)),
					}),
				),
			};
		} else {
			strip = {
				kind: "year",
				selected: 3,
				onShift: (by) => onZoomTo(openYear(store, year + 7 * by)),
				items: Array.from(
					{ length: 7 },
					(_, i): StripItem => ({
						name: "Year",
						label: String(year - 3 + i),
						marked: has(yearId(year - 3 + i)),
						onPick: () => onZoomTo(openYear(store, year - 3 + i)),
					}),
				),
			};
		}
	}

	return (
		<header className={styles.header}>
			<div className={styles.inner}>
				<Link
					to="/"
					viewTransition
					aria-label="Cascade home"
					className={styles.logo}
				>
					<LogoMark />
					<span className={styles.wordmark}>Cascade</span>
				</Link>
				<div className={styles.start}>
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
					date={zoomedId && dayLabel(zoomedId) ? dayDate(zoomedId) : new Date()}
					onPick={(date) => onZoomTo(dayId(date))}
					marked={marked}
					onToday={() => onZoomTo(dayId(new Date()))}
					onOlder={() => onZoomTo(dayId(shiftDay(zoomedId, -1)))}
					onNewer={() => onZoomTo(dayId(shiftDay(zoomedId, 1)))}
				/>
				<button
					type="button"
					aria-label="Search"
					title="Search"
					onClick={openCommandMenu}
					className={styles.search}
				>
					<MagnifyingGlassIcon size={14} />
				</button>
				<AccountButton />
			</div>
			{strip && <PeriodStrip {...strip} />}
		</header>
	);
});
