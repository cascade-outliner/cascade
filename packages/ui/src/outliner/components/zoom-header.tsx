import type { OutlineNode } from "@cascade/data";
import { colors, fontSize, space } from "@cascade/theme/tokens.stylex";
import { CaretLeftIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import type { EditorState } from "lexical";
import { ItemContext } from "../context.tsx";
import { Content } from "./content.tsx";

const styles = stylex.create({
	titleRow: {
		display: "flex",
		alignItems: "center",
		gap: space["3"],
	},
	backButton: {
		width: 20,
		height: 20,
		flexShrink: 0,
		border: "none",
		padding: 0,
		borderRadius: "50%",
		backgroundColor: colors.inkSubtle,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		cursor: "pointer",
		color: colors.muted,
		":hover": {
			backgroundColor: colors.inkSubtleHover,
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
	node: OutlineNode;
	/** Its parent, or `null` if it's a root node. */
	parentId: string | null;
	/** Zoom to another node, or `null` to zoom all the way out. */
	onZoomTo: (id: string | null) => void;
	onChange?: (state: EditorState) => void;
}

export function ZoomHeader({
	node,
	parentId,
	onZoomTo,
	onChange,
}: ZoomHeaderProps) {
	return (
		<div {...stylex.props(styles.titleRow)}>
			<button
				type="button"
				{...stylex.props(styles.backButton)}
				onClick={() => onZoomTo(parentId)}
				aria-label="Zoom out to parent"
			>
				<CaretLeftIcon size={11} weight="bold" />
			</button>
			<ItemContext.Provider value={{ node, depth: 0 }}>
				<Content key={node.id} style={styles.title} onChange={onChange} />
			</ItemContext.Provider>
		</div>
	);
}
