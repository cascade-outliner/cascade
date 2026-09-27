import { type Node, plainText } from "@cascade/data";
import { colors, fontSize, radius, space } from "@cascade/theme/tokens.stylex";
import { CaretRightIcon, HouseSimpleIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Fragment } from "react";

/** Ancestors beyond this many (from the current node) collapse behind an ellipsis. */
const MAX_VISIBLE_ANCESTORS = 3;

const styles = stylex.create({
	trail: {
		display: "flex",
		alignItems: "center",
		gap: space["0.5"],
		// Fill the slot so the transition box keeps its width; a content-sized box stretches the snapshot.
		flex: 1,
		minWidth: 0,
		fontSize: fontSize["300"],
		color: colors.muted,
		viewTransitionName: "zoom-trail",
	},
	homeButton: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: 20,
		height: 20,
		flexShrink: 0,
		border: "none",
		padding: 0,
		borderRadius: "50%",
		backgroundColor: colors.inkSubtle,
		color: colors.muted,
		cursor: "pointer",
		":hover": {
			backgroundColor: colors.inkSubtleHover,
			color: colors.ink,
		},
	},
	separator: {
		display: "flex",
		alignItems: "center",
		flexShrink: 0,
		color: colors.muted,
	},
	ellipsis: {
		flexShrink: 0,
	},
	crumbButton: {
		display: "block",
		minWidth: 0,
		border: "none",
		paddingBlock: space["0.5"],
		paddingInline: space["1.5"],
		borderRadius: radius.sm,
		backgroundColor: "transparent",
		font: "inherit",
		color: "inherit",
		cursor: "pointer",
		maxWidth: 200,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		":hover": {
			backgroundColor: colors.inkSubtleHover,
			color: colors.ink,
		},
	},
});

export interface BreadcrumbsProps {
	/** Ancestors of the current node, from the tree's root down to its immediate parent. */
	ancestors: Node[];
	/** Zoom to another node, or `null` to zoom all the way out. */
	onZoomTo: (id: string | null) => void;
	/** Display text for a node in place of its content, or `undefined` to show the content. */
	labelOf?: (node: Node) => string | undefined;
}

/** `⌂ › … › parent`: the way back up from a zoomed node. */
export function Breadcrumbs({
	ancestors,
	onZoomTo,
	labelOf,
}: BreadcrumbsProps) {
	const visible = ancestors.slice(-MAX_VISIBLE_ANCESTORS);
	const collapsed = ancestors.length > visible.length;

	return (
		<nav aria-label="Breadcrumbs" {...stylex.props(styles.trail)}>
			<button
				type="button"
				{...stylex.props(styles.homeButton)}
				onClick={() => onZoomTo(null)}
				aria-label="Zoom out to root"
			>
				<HouseSimpleIcon size={12} weight="bold" />
			</button>
			{collapsed && (
				<>
					<span {...stylex.props(styles.separator)}>
						<CaretRightIcon size={10} weight="bold" />
					</span>
					<span {...stylex.props(styles.ellipsis)} aria-hidden="true">
						…
					</span>
				</>
			)}
			{visible.map((ancestor) => (
				<Fragment key={ancestor.id}>
					<span {...stylex.props(styles.separator)}>
						<CaretRightIcon size={10} weight="bold" />
					</span>
					<button
						type="button"
						{...stylex.props(styles.crumbButton)}
						onClick={() => onZoomTo(ancestor.id)}
					>
						{labelOf?.(ancestor) ?? (plainText(ancestor.content) || "Untitled")}
					</button>
				</Fragment>
			))}
		</nav>
	);
}
