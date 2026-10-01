import type { ReactNode } from "react";
import type { FeatureIllustration } from "@/blocks/FeatureGrid";
import { css } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";

const styles = {
	stage: css.raw({
		height: "150px",
		borderRadius: "12px",
		backgroundColor: "site.tint",
		overflow: "hidden",
		fontFamily: "site.sans",
		color: "site.ink",
	}),
	label: css({
		fontFamily: "mono",
		fontSize: "0.6rem",
		fontWeight: 500,
		color: "site.muted",
		textTransform: "uppercase",
	}),
	// Board
	board: css.raw({
		padding: "14px",
		display: "grid",
		gridTemplateColumns: "repeat(3, 1fr)",
		gap: "8px",
	}),
	column: css({
		display: "flex",
		flexDirection: "column",
		gap: "6px",
	}),
	boardCard: css.raw({
		height: "24px",
		borderRadius: "6px",
		backgroundColor: "site.card",
	}),
	boardCardLifted: css.raw({
		boxShadow: "0 6px 14px -4px rgba(43, 45, 51, 0.3)",
		transform: "rotate(-3deg)",
		borderInlineStartWidth: "3px",
		borderInlineStartStyle: "solid",
		borderInlineStartColor: "site.primary",
	}),
	boardCardFaded: css.raw({
		opacity: 0.6,
	}),
	// Table
	table: css.raw({
		padding: "14px",
		display: "flex",
		flexDirection: "column",
		fontFamily: "mono",
		fontSize: "0.625rem",
		fontWeight: 500,
		color: "site.muted",
	}),
	tableRow: css.raw({
		display: "grid",
		gridTemplateColumns: "2fr 1fr 1fr",
		paddingBlock: "8px",
		paddingInline: "4px",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: "rgba(43, 45, 51, 0.06)",
		color: "site.ink",
	}),
	tableHead: css.raw({
		paddingBlockStart: 0,
		paddingBlockEnd: "7px",
		borderBottomColor: "rgba(43, 45, 51, 0.1)",
		color: "site.muted",
	}),
	tableIndented: css.raw({
		paddingInlineStart: "16px",
	}),
	tableLast: css.raw({
		borderBottomWidth: 0,
	}),
	editingCell: css({
		backgroundColor: "site.card",
		boxShadow: "inset 0 0 0 1.5px token(colors.site.primary)",
		borderRadius: "4px",
		paddingInline: "4px",
		marginBlock: "-1px",
		marginInlineStart: "-4px",
		marginInlineEnd: "8px",
	}),
	// Links
	links: css.raw({
		paddingBlock: "16px",
		paddingInline: "18px",
		display: "flex",
		flexDirection: "column",
		gap: "10px",
		fontSize: "0.875rem",
	}),
	linkToken: css({
		color: "site.primary",
		backgroundColor: "site.primaryTintStrong",
		borderRadius: "4px",
		paddingInline: "4px",
	}),
	cursor: css({
		display: "inline-block",
		width: "1.5px",
		height: "15px",
		backgroundColor: "site.ink",
		verticalAlign: "middle",
	}),
	popover: css({
		width: "220px",
		padding: "6px",
		borderRadius: "9px",
		backgroundColor: "site.card",
		boxShadow: "0 8px 20px -8px rgba(43, 45, 51, 0.3)",
		display: "flex",
		flexDirection: "column",
		gap: "2px",
		fontSize: "0.8125rem",
	}),
	popoverItem: css.raw({
		paddingBlock: "5px",
		paddingInline: "8px",
		borderRadius: "6px",
	}),
	popoverActive: css.raw({
		backgroundColor: "rgba(173, 76, 78, 0.08)",
	}),
	popoverMuted: css.raw({
		color: "site.muted",
	}),
	// Mirrors
	mirrors: css.raw({
		paddingBlock: "16px",
		paddingInline: "18px",
		display: "flex",
		flexDirection: "column",
		gap: "9px",
		fontSize: "0.84rem",
	}),
	mirrorRow: css({
		display: "flex",
		alignItems: "center",
		gap: "9px",
	}),
	ring: css({
		width: "16px",
		height: "16px",
		flexShrink: 0,
		borderRadius: "50%",
		boxShadow: "0 0 0 2px token(colors.site.primary)",
		display: "grid",
		placeItems: "center",
	}),
	ringDot: css({
		width: "5px",
		height: "5px",
		borderRadius: "50%",
		backgroundColor: "site.primary",
	}),
	spaced: css({
		marginBlockStart: "6px",
	}),
	// Split
	split: css.raw({
		padding: "12px",
		display: "grid",
		gridTemplateColumns: "1fr 1fr",
		gap: "8px",
	}),
	pane: css.raw({
		padding: "10px",
		borderRadius: "8px",
		backgroundColor: "site.card",
		display: "flex",
		flexDirection: "column",
		gap: "7px",
	}),
	paneActive: css.raw({
		boxShadow: "inset 0 2px 0 token(colors.site.primary)",
	}),
	line: css.raw({
		height: "6px",
		borderRadius: "4px",
		backgroundColor: "site.onDarkMuted",
		marginInlineStart: "10px",
	}),
	lineTitle: css.raw({
		height: "7px",
		backgroundColor: "site.ink",
		opacity: 0.75,
		marginInlineStart: 0,
	}),
	// History
	history: css.raw({
		padding: "18px",
		display: "flex",
		flexDirection: "column",
		justifyContent: "center",
		gap: "14px",
		fontSize: "0.84rem",
	}),
	struck: css({
		textDecoration: "line-through",
		color: "site.faint",
	}),
	added: css({
		backgroundColor: "site.success",
		borderRadius: "3px",
		paddingInline: "3px",
	}),
	scrubber: css({
		position: "relative",
		height: "18px",
		display: "flex",
		alignItems: "center",
	}),
	track: css({
		height: "3px",
		width: "100%",
		borderRadius: "2px",
		backgroundColor: "site.rule",
	}),
	progress: css({
		position: "absolute",
		insetInlineStart: 0,
		width: "64%",
		height: "3px",
		borderRadius: "2px",
		backgroundColor: "site.primary",
	}),
	thumb: css({
		position: "absolute",
		insetInlineStart: "62%",
		width: "14px",
		height: "14px",
		borderRadius: "50%",
		backgroundColor: "site.card",
		boxShadow: "0 0 0 2px token(colors.site.primary)",
	}),
};

function Stage({
	children,
	css: cssProp,
}: {
	children: ReactNode;
	css: SystemStyleObject;
}) {
	return (
		<div aria-hidden="true" className={css(styles.stage, cssProp)}>
			{children}
		</div>
	);
}

function Label({ children }: { children: ReactNode }) {
	return <span className={styles.label}>{children}</span>;
}

function BoardIllustration() {
	return (
		<Stage css={styles.board}>
			<div className={styles.column}>
				<Label>To pack</Label>
				<div className={css(styles.boardCard)} />
				<div className={css(styles.boardCard)} />
				<div className={css(styles.boardCard)} />
			</div>
			<div className={styles.column}>
				<Label>Packing</Label>
				<div className={css(styles.boardCard, styles.boardCardLifted)} />
				<div className={css(styles.boardCard)} />
			</div>
			<div className={styles.column}>
				<Label>In boxes</Label>
				<div className={css(styles.boardCard, styles.boardCardFaded)} />
			</div>
		</Stage>
	);
}

function TableIllustration() {
	return (
		<Stage css={styles.table}>
			<div className={css(styles.tableRow, styles.tableHead)}>
				<span>TASK</span>
				<span>DUE</span>
				<span>OWNER</span>
			</div>
			<div className={css(styles.tableRow)}>
				<span>▾ Movers</span>
				<span>Sep 24</span>
				<span>Ana</span>
			</div>
			<div className={css(styles.tableRow, styles.tableIndented)}>
				<span>Get quotes</span>
				<span className={styles.editingCell}>Sep 20</span>
				<span>Ana</span>
			</div>
			<div className={css(styles.tableRow, styles.tableLast)}>
				<span>▸ Utilities</span>
				<span>Sep 22</span>
				<span>Jo</span>
			</div>
		</Stage>
	);
}

function LinksIllustration() {
	return (
		<Stage css={styles.links}>
			<div>
				Call <span className={styles.linkToken}>[[Delgado Movers</span>
				<span className={styles.cursor} />
			</div>
			<div className={styles.popover}>
				<span className={css(styles.popoverItem, styles.popoverActive)}>
					Delgado Movers
				</span>
				<span className={css(styles.popoverItem, styles.popoverMuted)}>
					Delgado — invoice
				</span>
			</div>
		</Stage>
	);
}

function MirrorRow({ children }: { children: ReactNode }) {
	return (
		<div className={styles.mirrorRow}>
			<span className={styles.ring}>
				<span className={styles.ringDot} />
			</span>
			{children}
		</div>
	);
}

function MirrorsIllustration() {
	return (
		<Stage css={styles.mirrors}>
			<Label>Weekly review</Label>
			<MirrorRow>Sign the lease</MirrorRow>
			<span className={styles.spaced}>
				<Label>Apartment move</Label>
			</span>
			<MirrorRow>Sign the lease</MirrorRow>
		</Stage>
	);
}

/** A bar of the pane's width, in percent. */
function Line({ width, title }: { width: number; title?: boolean }) {
	return (
		<div
			className={css(styles.line, title && styles.lineTitle)}
			style={{ width: `${width}%` }}
		/>
	);
}

function SplitIllustration() {
	return (
		<Stage css={styles.split}>
			<div className={css(styles.pane, styles.paneActive)}>
				<Line width={70} title />
				<Line width={85} />
				<Line width={60} />
				<Line width={75} />
			</div>
			<div className={css(styles.pane)}>
				<Line width={55} title />
				<Line width={80} />
				<Line width={50} />
			</div>
		</Stage>
	);
}

function HistoryIllustration() {
	return (
		<Stage css={styles.history}>
			<div>
				<span className={styles.struck}>Chapter 2: ???</span>{" "}
				<span className={styles.added}>Chapter 2: the heist</span>
			</div>
			<div className={styles.scrubber}>
				<div className={styles.track} />
				<div className={styles.progress} />
				<div className={styles.thumb} />
			</div>
			<Label>Tuesday, 11:40</Label>
		</Stage>
	);
}

const ILLUSTRATIONS: Record<FeatureIllustration, () => ReactNode> = {
	board: BoardIllustration,
	table: TableIllustration,
	links: LinksIllustration,
	mirrors: MirrorsIllustration,
	split: SplitIllustration,
	history: HistoryIllustration,
};

/** Decorative preview of a feature. Hidden from assistive tech; the card text carries the meaning. */
export function FeatureIllustrationView({
	kind,
}: {
	kind: FeatureIllustration;
}) {
	const Illustration = ILLUSTRATIONS[kind];
	return <Illustration />;
}
