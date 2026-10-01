import type { ReactNode } from "react";
import type { FeatureIllustration } from "@/blocks/FeatureGrid";
import { css, cva } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";

const styles = {
	stage: css.raw({
		height: "[150px]",
		borderRadius: "lg",
		backgroundColor: "site.tint",
		overflow: "hidden",
		fontFamily: "site.sans",
		color: "site.ink",
	}),
	label: css({
		fontFamily: "mono",
		fontSize: "site.micro",
		fontWeight: 500,
		color: "site.muted",
		textTransform: "uppercase",
	}),
	// Board
	board: css.raw({
		padding: "3.5",
		display: "grid",
		gridTemplateColumns: "repeat(3, 1fr)",
		gap: "2",
	}),
	column: css({
		display: "flex",
		flexDirection: "column",
		gap: "1.5",
	}),
	// Table
	table: css.raw({
		padding: "3.5",
		display: "flex",
		flexDirection: "column",
		fontFamily: "mono",
		fontSize: "site.micro",
		fontWeight: 500,
		color: "site.muted",
	}),
	editingCell: css({
		backgroundColor: "site.card",
		boxShadow: "site.ringInset",
		borderRadius: "sm",
		paddingInline: "1",
		marginBlock: "-px",
		marginInlineStart: "-1",
		marginInlineEnd: "2",
	}),
	// Links
	links: css.raw({
		paddingBlock: "4",
		paddingInline: "[18px]",
		display: "flex",
		flexDirection: "column",
		gap: "2.5",
		fontSize: "site.caption",
	}),
	linkToken: css({
		color: "site.primary",
		backgroundColor: "site.primaryTintStrong",
		borderRadius: "sm",
		paddingInline: "1",
	}),
	cursor: css({
		display: "inline-block",
		width: "[1.5px]",
		height: "[15px]",
		backgroundColor: "site.ink",
		verticalAlign: "middle",
	}),
	popover: css({
		width: "popup.sm",
		padding: "1.5",
		borderRadius: "site.pill",
		backgroundColor: "site.card",
		boxShadow: "site.pop",
		display: "flex",
		flexDirection: "column",
		gap: "0.5",
		fontSize: "site.caption",
	}),
	// Mirrors
	mirrors: css.raw({
		paddingBlock: "4",
		paddingInline: "[18px]",
		display: "flex",
		flexDirection: "column",
		gap: "[9px]",
		fontSize: "site.caption",
	}),
	mirrorRow: css({
		display: "flex",
		alignItems: "center",
		gap: "[9px]",
	}),
	ring: css({
		width: "icon.md",
		height: "icon.md",
		flexShrink: 0,
		borderRadius: "circle",
		boxShadow: "site.ring",
		display: "grid",
		placeItems: "center",
	}),
	ringDot: css({
		width: "[5px]",
		height: "[5px]",
		borderRadius: "circle",
		backgroundColor: "site.primary",
	}),
	spaced: css({
		marginBlockStart: "1.5",
	}),
	// Split
	split: css.raw({
		padding: "3",
		display: "grid",
		gridTemplateColumns: "1fr 1fr",
		gap: "2",
	}),
	// History
	history: css.raw({
		padding: "[18px]",
		display: "flex",
		flexDirection: "column",
		justifyContent: "center",
		gap: "3.5",
		fontSize: "site.caption",
	}),
	struck: css({
		textDecoration: "line-through",
		color: "site.faint",
	}),
	added: css({
		backgroundColor: "site.success",
		borderRadius: "xs",
		paddingInline: "[3px]",
	}),
	scrubber: css({
		position: "relative",
		height: "control.xs",
		display: "flex",
		alignItems: "center",
	}),
	track: css({
		height: "dot.sm",
		width: "full",
		borderRadius: "xs",
		backgroundColor: "site.rule",
	}),
	progress: css({
		position: "absolute",
		insetInlineStart: "0",
		width: "[64%]",
		height: "dot.sm",
		borderRadius: "xs",
		backgroundColor: "site.primary",
	}),
	thumb: css({
		position: "absolute",
		insetInlineStart: "[62%]",
		width: "[14px]",
		height: "[14px]",
		borderRadius: "circle",
		backgroundColor: "site.card",
		boxShadow: "site.ring",
	}),
};

const boardCard = cva({
	base: {
		height: "control.md",
		borderRadius: "site.control",
		backgroundColor: "site.card",
	},
	variants: {
		lifted: {
			true: {
				boxShadow: "site.pop",
				transform: "rotate(-3deg)",
				borderInlineStartWidth: "accent",
				borderInlineStartStyle: "solid",
				borderInlineStartColor: "site.primary",
			},
		},
		faded: {
			true: { opacity: "muted" },
		},
	},
});

const tableRow = cva({
	base: {
		display: "grid",
		gridTemplateColumns: "2fr 1fr 1fr",
		paddingBlock: "2",
		paddingInline: "1",
		borderBottomWidth: "thin",
		borderBottomStyle: "solid",
		borderBottomColor: "site.hairlineSoft",
		color: "site.ink",
	},
	variants: {
		head: {
			true: {
				paddingBlockStart: "0",
				paddingBlockEnd: "[7px]",
				borderBottomColor: "site.rule",
				color: "site.muted",
			},
		},
		indented: {
			true: { paddingInlineStart: "4" },
		},
		last: {
			true: { borderBottomWidth: "0" },
		},
	},
});

const popoverItem = cva({
	base: {
		paddingBlock: "[5px]",
		paddingInline: "2",
		borderRadius: "site.control",
	},
	variants: {
		tone: {
			active: { backgroundColor: "site.primaryTint" },
			muted: { color: "site.muted" },
		},
	},
});

const pane = cva({
	base: {
		padding: "2.5",
		borderRadius: "md",
		backgroundColor: "site.card",
		display: "flex",
		flexDirection: "column",
		gap: "[7px]",
	},
	variants: {
		active: {
			true: { boxShadow: "site.topBar" },
		},
	},
});

const line = cva({
	base: {
		height: "dot.lg",
		borderRadius: "sm",
		backgroundColor: "site.onDarkMuted",
		marginInlineStart: "2.5",
	},
	variants: {
		title: {
			true: {
				height: "[7px]",
				backgroundColor: "site.ink",
				opacity: "soft",
				marginInlineStart: "0",
			},
		},
	},
});

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
				<div className={boardCard()} />
				<div className={boardCard()} />
				<div className={boardCard()} />
			</div>
			<div className={styles.column}>
				<Label>Packing</Label>
				<div className={boardCard({ lifted: true })} />
				<div className={boardCard()} />
			</div>
			<div className={styles.column}>
				<Label>In boxes</Label>
				<div className={boardCard({ faded: true })} />
			</div>
		</Stage>
	);
}

function TableIllustration() {
	return (
		<Stage css={styles.table}>
			<div className={tableRow({ head: true })}>
				<span>TASK</span>
				<span>DUE</span>
				<span>OWNER</span>
			</div>
			<div className={tableRow()}>
				<span>▾ Movers</span>
				<span>Sep 24</span>
				<span>Ana</span>
			</div>
			<div className={tableRow({ indented: true })}>
				<span>Get quotes</span>
				<span className={styles.editingCell}>Sep 20</span>
				<span>Ana</span>
			</div>
			<div className={tableRow({ last: true })}>
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
				<span className={popoverItem({ tone: "active" })}>Delgado Movers</span>
				<span className={popoverItem({ tone: "muted" })}>
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
	return <div className={line({ title })} style={{ width: `${width}%` }} />;
}

function SplitIllustration() {
	return (
		<Stage css={styles.split}>
			<div className={pane({ active: true })}>
				<Line width={70} title />
				<Line width={85} />
				<Line width={60} />
				<Line width={75} />
			</div>
			<div className={pane()}>
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
