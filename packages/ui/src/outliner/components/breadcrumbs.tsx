import { type Node, plainText } from "@cascade/data";
import { css } from "@cascade/theme/css";
import { CaretRightIcon, HouseSimpleIcon } from "@phosphor-icons/react";
import { Fragment } from "react";

/** Ancestors beyond this many (from the current node) collapse behind an ellipsis. */
const MAX_VISIBLE_ANCESTORS = 3;

const styles = {
	trail: css({
		display: "flex",
		alignItems: "center",
		gap: "0.5",
		// Fill the slot so the transition box keeps its width; a content-sized box stretches the snapshot.
		flex: 1,
		minWidth: 0,
		fontSize: "300",
		color: "muted",
		viewTransitionName: "zoom-trail",
	}),
	homeButton: css({
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "20px",
		height: "20px",
		flexShrink: 0,
		border: "none",
		padding: 0,
		borderRadius: "50%",
		backgroundColor: "inkSubtle",
		color: "muted",
		cursor: "pointer",
		_hover: {
			backgroundColor: "inkSubtleHover",
			color: "ink",
		},
	}),
	separator: css({
		display: "flex",
		alignItems: "center",
		flexShrink: 0,
		color: "muted",
	}),
	ellipsis: css({
		flexShrink: 0,
	}),
	crumbButton: css({
		display: "block",
		minWidth: 0,
		border: "none",
		paddingBlock: "0.5",
		paddingInline: "1.5",
		borderRadius: "sm",
		backgroundColor: "transparent",
		font: "inherit",
		color: "inherit",
		cursor: "pointer",
		maxWidth: "200px",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		_hover: {
			backgroundColor: "inkSubtleHover",
			color: "ink",
		},
	}),
};

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
		<nav aria-label="Breadcrumbs" className={styles.trail}>
			<button
				type="button"
				className={styles.homeButton}
				onClick={() => onZoomTo(null)}
				aria-label="Zoom out to root"
			>
				<HouseSimpleIcon size={12} weight="bold" />
			</button>
			{collapsed && (
				<>
					<span className={styles.separator}>
						<CaretRightIcon size={10} weight="bold" />
					</span>
					<span className={styles.ellipsis} aria-hidden="true">
						…
					</span>
				</>
			)}
			{visible.map((ancestor) => (
				<Fragment key={ancestor.id}>
					<span className={styles.separator}>
						<CaretRightIcon size={10} weight="bold" />
					</span>
					<button
						type="button"
						className={styles.crumbButton}
						onClick={() => onZoomTo(ancestor.id)}
					>
						{labelOf?.(ancestor) ?? (plainText(ancestor.content) || "Untitled")}
					</button>
				</Fragment>
			))}
		</nav>
	);
}
