import * as stylex from "@stylexjs/stylex";
import { ItemContext } from "../context";
import type { OutlineNode } from "../types";
import { rowVars } from "../vars.stylex";

const styles = stylex.create({
	item: {
		display: "flex",
		flexDirection: "column",
		gap: 4,
		[rowVars.actionsOpacity]: {
			default: "0",
			":hover": "1",
		},
	},
});

export interface ItemProps {
	node: OutlineNode;
	depth: number;
	children: React.ReactNode;
	style?: stylex.StyleXStyles;
}

export function Item({ node, depth, children, style }: ItemProps) {
	return (
		<ItemContext.Provider value={{ node, depth }}>
			<div {...stylex.props(styles.item, style)}>{children}</div>
		</ItemContext.Provider>
	);
}
