import { fonts } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import type { FeatureIllustration } from "@/blocks/FeatureGrid";
import { site, siteFont } from "@/theme/site.stylex";

const styles = stylex.create({
	stage: {
		height: 150,
		borderRadius: "12px",
		backgroundColor: site.tint,
		overflow: "hidden",
		fontFamily: siteFont.sans,
		color: site.ink,
	},
	label: {
		fontFamily: fonts.mono,
		fontSize: "0.6rem",
		fontWeight: 500,
		color: site.muted,
		textTransform: "uppercase",
	},
	// Board
	board: {
		padding: 14,
		display: "grid",
		gridTemplateColumns: "repeat(3, 1fr)",
		gap: 8,
	},
	column: {
		display: "flex",
		flexDirection: "column",
		gap: 6,
	},
	boardCard: {
		height: 24,
		borderRadius: "6px",
		backgroundColor: site.card,
	},
	boardCardLifted: {
		boxShadow: "0 6px 14px -4px rgba(43, 45, 51, 0.3)",
		transform: "rotate(-3deg)",
		borderInlineStartWidth: 3,
		borderInlineStartStyle: "solid",
		borderInlineStartColor: site.primary,
	},
	boardCardFaded: {
		opacity: 0.6,
	},
	// Table
	table: {
		padding: 14,
		display: "flex",
		flexDirection: "column",
		fontFamily: fonts.mono,
		fontSize: "0.625rem",
		fontWeight: 500,
		color: site.muted,
	},
	tableRow: {
		display: "grid",
		gridTemplateColumns: "2fr 1fr 1fr",
		paddingBlock: 8,
		paddingInline: 4,
		borderBottomWidth: 1,
		borderBottomStyle: "solid",
		borderBottomColor: "rgba(43, 45, 51, 0.06)",
		color: site.ink,
	},
	tableHead: {
		paddingBlock: "0 7px",
		borderBottomColor: "rgba(43, 45, 51, 0.1)",
		color: site.muted,
	},
	tableIndented: {
		paddingInlineStart: 16,
	},
	tableLast: {
		borderBottomWidth: 0,
	},
	editingCell: {
		backgroundColor: site.card,
		boxShadow: `inset 0 0 0 1.5px ${site.primary}`,
		borderRadius: "4px",
		paddingInline: 4,
		marginBlock: -1,
		marginInline: "-4px 8px",
	},
	// Links
	links: {
		padding: "16px 18px",
		display: "flex",
		flexDirection: "column",
		gap: 10,
		fontSize: "0.875rem",
	},
	linkToken: {
		color: site.primary,
		backgroundColor: site.primaryTintStrong,
		borderRadius: "4px",
		paddingInline: 4,
	},
	cursor: {
		display: "inline-block",
		width: 1.5,
		height: 15,
		backgroundColor: site.ink,
		verticalAlign: "middle",
	},
	popover: {
		width: 220,
		padding: 6,
		borderRadius: "9px",
		backgroundColor: site.card,
		boxShadow: "0 8px 20px -8px rgba(43, 45, 51, 0.3)",
		display: "flex",
		flexDirection: "column",
		gap: 2,
		fontSize: "0.8125rem",
	},
	popoverItem: {
		paddingBlock: 5,
		paddingInline: 8,
		borderRadius: "6px",
	},
	popoverActive: {
		backgroundColor: "rgba(173, 76, 78, 0.08)",
	},
	popoverMuted: {
		color: site.muted,
	},
	// Mirrors
	mirrors: {
		padding: "16px 18px",
		display: "flex",
		flexDirection: "column",
		gap: 9,
		fontSize: "0.84rem",
	},
	mirrorRow: {
		display: "flex",
		alignItems: "center",
		gap: 9,
	},
	ring: {
		width: 16,
		height: 16,
		flexShrink: 0,
		borderRadius: "50%",
		boxShadow: `0 0 0 2px ${site.primary}`,
		display: "grid",
		placeItems: "center",
	},
	ringDot: {
		width: 5,
		height: 5,
		borderRadius: "50%",
		backgroundColor: site.primary,
	},
	spaced: {
		marginBlockStart: 6,
	},
	// Split
	split: {
		padding: 12,
		display: "grid",
		gridTemplateColumns: "1fr 1fr",
		gap: 8,
	},
	pane: {
		padding: 10,
		borderRadius: "8px",
		backgroundColor: site.card,
		display: "flex",
		flexDirection: "column",
		gap: 7,
	},
	paneActive: {
		boxShadow: `inset 0 2px 0 ${site.primary}`,
	},
	line: {
		height: 6,
		borderRadius: "4px",
		backgroundColor: site.onDarkMuted,
		marginInlineStart: 10,
	},
	lineTitle: {
		height: 7,
		backgroundColor: site.ink,
		opacity: 0.75,
		marginInlineStart: 0,
	},
	width: (percent: number) => ({ width: `${percent}%` }),
	// History
	history: {
		padding: 18,
		display: "flex",
		flexDirection: "column",
		justifyContent: "center",
		gap: 14,
		fontSize: "0.84rem",
	},
	struck: {
		textDecoration: "line-through",
		color: site.faint,
	},
	added: {
		backgroundColor: site.success,
		borderRadius: "3px",
		paddingInline: 3,
	},
	scrubber: {
		position: "relative",
		height: 18,
		display: "flex",
		alignItems: "center",
	},
	track: {
		height: 3,
		width: "100%",
		borderRadius: "2px",
		backgroundColor: site.rule,
	},
	progress: {
		position: "absolute",
		insetInlineStart: 0,
		width: "64%",
		height: 3,
		borderRadius: "2px",
		backgroundColor: site.primary,
	},
	thumb: {
		position: "absolute",
		insetInlineStart: "62%",
		width: 14,
		height: 14,
		borderRadius: "50%",
		backgroundColor: site.card,
		boxShadow: `0 0 0 2px ${site.primary}`,
	},
});

function Stage({
	children,
	style,
}: {
	children: ReactNode;
	style: stylex.StyleXStyles;
}) {
	return (
		<div aria-hidden="true" {...stylex.props(styles.stage, style)}>
			{children}
		</div>
	);
}

function Label({ children }: { children: ReactNode }) {
	return <span {...stylex.props(styles.label)}>{children}</span>;
}

function BoardIllustration() {
	return (
		<Stage style={styles.board}>
			<div {...stylex.props(styles.column)}>
				<Label>To pack</Label>
				<div {...stylex.props(styles.boardCard)} />
				<div {...stylex.props(styles.boardCard)} />
				<div {...stylex.props(styles.boardCard)} />
			</div>
			<div {...stylex.props(styles.column)}>
				<Label>Packing</Label>
				<div {...stylex.props(styles.boardCard, styles.boardCardLifted)} />
				<div {...stylex.props(styles.boardCard)} />
			</div>
			<div {...stylex.props(styles.column)}>
				<Label>In boxes</Label>
				<div {...stylex.props(styles.boardCard, styles.boardCardFaded)} />
			</div>
		</Stage>
	);
}

function TableIllustration() {
	return (
		<Stage style={styles.table}>
			<div {...stylex.props(styles.tableRow, styles.tableHead)}>
				<span>TASK</span>
				<span>DUE</span>
				<span>OWNER</span>
			</div>
			<div {...stylex.props(styles.tableRow)}>
				<span>▾ Movers</span>
				<span>Sep 24</span>
				<span>Ana</span>
			</div>
			<div {...stylex.props(styles.tableRow, styles.tableIndented)}>
				<span>Get quotes</span>
				<span {...stylex.props(styles.editingCell)}>Sep 20</span>
				<span>Ana</span>
			</div>
			<div {...stylex.props(styles.tableRow, styles.tableLast)}>
				<span>▸ Utilities</span>
				<span>Sep 22</span>
				<span>Jo</span>
			</div>
		</Stage>
	);
}

function LinksIllustration() {
	return (
		<Stage style={styles.links}>
			<div>
				Call <span {...stylex.props(styles.linkToken)}>[[Delgado Movers</span>
				<span {...stylex.props(styles.cursor)} />
			</div>
			<div {...stylex.props(styles.popover)}>
				<span {...stylex.props(styles.popoverItem, styles.popoverActive)}>
					Delgado Movers
				</span>
				<span {...stylex.props(styles.popoverItem, styles.popoverMuted)}>
					Delgado — invoice
				</span>
			</div>
		</Stage>
	);
}

function MirrorRow({ children }: { children: ReactNode }) {
	return (
		<div {...stylex.props(styles.mirrorRow)}>
			<span {...stylex.props(styles.ring)}>
				<span {...stylex.props(styles.ringDot)} />
			</span>
			{children}
		</div>
	);
}

function MirrorsIllustration() {
	return (
		<Stage style={styles.mirrors}>
			<Label>Weekly review</Label>
			<MirrorRow>Sign the lease</MirrorRow>
			<span {...stylex.props(styles.spaced)}>
				<Label>Apartment move</Label>
			</span>
			<MirrorRow>Sign the lease</MirrorRow>
		</Stage>
	);
}

function SplitIllustration() {
	return (
		<Stage style={styles.split}>
			<div {...stylex.props(styles.pane, styles.paneActive)}>
				<div
					{...stylex.props(styles.line, styles.lineTitle, styles.width(70))}
				/>
				<div {...stylex.props(styles.line, styles.width(85))} />
				<div {...stylex.props(styles.line, styles.width(60))} />
				<div {...stylex.props(styles.line, styles.width(75))} />
			</div>
			<div {...stylex.props(styles.pane)}>
				<div
					{...stylex.props(styles.line, styles.lineTitle, styles.width(55))}
				/>
				<div {...stylex.props(styles.line, styles.width(80))} />
				<div {...stylex.props(styles.line, styles.width(50))} />
			</div>
		</Stage>
	);
}

function HistoryIllustration() {
	return (
		<Stage style={styles.history}>
			<div>
				<span {...stylex.props(styles.struck)}>Chapter 2: ???</span>{" "}
				<span {...stylex.props(styles.added)}>Chapter 2: the heist</span>
			</div>
			<div {...stylex.props(styles.scrubber)}>
				<div {...stylex.props(styles.track)} />
				<div {...stylex.props(styles.progress)} />
				<div {...stylex.props(styles.thumb)} />
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
