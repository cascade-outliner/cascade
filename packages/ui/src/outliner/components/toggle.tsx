import { colors } from "@cascade/theme/tokens.stylex";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { useItem } from "../context";

const styles = stylex.create({
	toggle: {
		display: "inline-flex",
		width: 18,
		height: 18,
		flexShrink: 0,
		cursor: "pointer",
		userSelect: "none",
		alignItems: "center",
		justifyContent: "center",
		padding: 0,
		color: {
			default: colors.muted,
			":hover": colors.ink,
			":focus-visible": colors.ink,
		},
	},
	icon: {
		transitionProperty: "transform",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	expanded: {
		transform: "rotate(90deg)",
	},
	spacer: {
		display: "inline-block",
		width: 18,
		height: 18,
		flexShrink: 0,
	},
});

export function Toggle({
	style,
	onToggle,
}: {
	style?: stylex.StyleXStyles;
	onToggle?: (id: string, collapsed: boolean) => void;
}) {
	const { node } = useItem();

	if (node.children.length === 0) {
		return <span {...stylex.props(styles.spacer, style)} />;
	}

	return (
		<button
			type="button"
			{...stylex.props(styles.toggle, style)}
			onClick={() => onToggle?.(node.id, !node.collapsed)}
		>
			<CaretRight
				{...stylex.props(styles.icon, !node.collapsed && styles.expanded)}
				size={12}
				weight="bold"
			/>
		</button>
	);
}
