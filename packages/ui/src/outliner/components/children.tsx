import * as stylex from "@stylexjs/stylex";
import { useItem } from "../context";
import { mapSiblings, type SiblingRenderer } from "../lib/map-siblings";

const styles = stylex.create({
	children: {
		display: "flex",
		flexDirection: "column",
		gap: 4,
		paddingLeft: 20,
	},
});

export interface ChildrenProps {
	style?: stylex.StyleXStyles;
	children: SiblingRenderer;
}

export function Children({ style, children }: ChildrenProps) {
	const { node, depth } = useItem();

	if (node.children.length === 0 || node.collapsed) {
		return null;
	}

	return (
		<div {...stylex.props(styles.children, style)}>
			{mapSiblings(node.children, depth + 1, children)}
		</div>
	);
}
