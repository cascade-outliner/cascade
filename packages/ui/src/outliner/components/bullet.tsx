import { colors } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	bullet: {
		width: 18,
		height: 18,
		flexShrink: 0,
		borderRadius: "50%",
		backgroundColor: colors.inkSubtle,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		border: "none",
		padding: 0,
		cursor: "pointer",
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: "50%",
		backgroundColor: colors.muted,
	},
	collapsed: {
		boxShadow: `0 0 0 3.5px ${colors.inkSubtle}`,
	},
});

export interface BulletProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	/** Shows a ring, indicating the node has hidden children. */
	collapsed?: boolean;
}

/** The zoom target on every node: click to zoom in on it. */
export function Bullet({ collapsed, ...props }: BulletProps) {
	return (
		<button
			type="button"
			{...stylex.props(styles.bullet, collapsed && styles.collapsed)}
			{...props}
		>
			<div {...stylex.props(styles.dot)} />
		</button>
	);
}
