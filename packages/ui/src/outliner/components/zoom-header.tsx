import { type Node, plainText } from "@cascade/data";
import { colors, fontSize, space } from "@cascade/theme/tokens.stylex";
import { CaretRightIcon, HouseSimpleIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import type { EditorState } from "lexical";
import { Fragment } from "react";
import { ItemContext } from "../context.tsx";
import { Content } from "./content.tsx";

/** Ancestors beyond this many (from the current node) collapse behind an ellipsis. */
const MAX_VISIBLE_ANCESTORS = 3;

const styles = stylex.create({
	header: {
		display: "flex",
		flexDirection: "column",
		gap: space["1"],
	},
	trail: {
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		gap: space["1"],
		fontSize: fontSize["300"],
		color: colors.muted,
	},
	homeButton: {
		display: "flex",
		alignItems: "center",
		border: "none",
		padding: 0,
		background: "none",
		color: "inherit",
		cursor: "pointer",
		":hover": {
			color: colors.ink,
		},
	},
	crumbButton: {
		border: "none",
		padding: 0,
		background: "none",
		font: "inherit",
		color: "inherit",
		cursor: "pointer",
		maxWidth: 200,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		":hover": {
			color: colors.ink,
			textDecoration: "underline",
		},
	},
	title: {
		fontSize: fontSize["800"],
		fontWeight: 600,
		letterSpacing: "-0.02em",
	},
});

export interface ZoomHeaderProps {
	/** The node currently zoomed into. */
	node: Node;
	/** Its ancestors, from the tree's root down to its immediate parent. */
	ancestors: Node[];
	/** Zoom to another node, or `null` to zoom all the way out. */
	onZoomTo: (id: string | null) => void;
	onChange?: (state: EditorState) => void;
}

export function ZoomHeader({
	node,
	ancestors,
	onZoomTo,
	onChange,
}: ZoomHeaderProps) {
	const visible =
		ancestors.length > MAX_VISIBLE_ANCESTORS
			? ancestors.slice(-MAX_VISIBLE_ANCESTORS)
			: ancestors;
	const collapsed = ancestors.length > visible.length;

	return (
		<div {...stylex.props(styles.header)}>
			<div {...stylex.props(styles.trail)}>
				<button
					type="button"
					{...stylex.props(styles.homeButton)}
					onClick={() => onZoomTo(null)}
					aria-label="Zoom out to root"
				>
					<HouseSimpleIcon size={13} weight="bold" />
				</button>
				{collapsed && (
					<>
						<CaretRightIcon size={10} weight="bold" />
						<span aria-hidden="true">…</span>
					</>
				)}
				{visible.map((ancestor) => (
					<Fragment key={ancestor.id}>
						<CaretRightIcon size={10} weight="bold" />
						<button
							type="button"
							{...stylex.props(styles.crumbButton)}
							onClick={() => onZoomTo(ancestor.id)}
						>
							{plainText(ancestor.content) || "Untitled"}
						</button>
					</Fragment>
				))}
			</div>
			<ItemContext.Provider value={{ node, depth: 0 }}>
				<Content key={node.id} style={styles.title} onChange={onChange} />
			</ItemContext.Provider>
		</div>
	);
}
