import type { OutlineNode } from "@cascade/data";
import { colors, fontSize, space } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { EditorState } from "lexical";
import { ItemContext } from "../context.tsx";
import { Content } from "./content.tsx";

const styles = stylex.create({
	titleRow: {
		display: "flex",
		alignItems: "center",
		gap: space["11"],
	},
	bullet: {
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
	},
	dot: {
		width: 7,
		height: 7,
		borderRadius: "50%",
		backgroundColor: colors.muted,
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
				{...stylex.props(styles.bullet)}
				onClick={() => onZoomTo(parentId)}
				aria-label="Zoom out"
			>
				<div {...stylex.props(styles.dot)} />
			</button>
			<ItemContext.Provider value={{ node, depth: 0 }}>
				<Content style={styles.title} onChange={onChange} />
			</ItemContext.Provider>
		</div>
	);
}
