import { colors } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	bullet: {
		width: 18,
		height: 18,
		flexShrink: 0,
		borderRadius: "50%",
		backgroundColor: "rgba(43, 45, 51, 0.09)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: "50%",
		backgroundColor: colors.muted,
	},
	collapsed: {
		boxShadow: "0 0 0 3.5px rgba(43, 45, 51, 0.07)",
	},
});

export interface BulletProps {
	/** Shows a ring, indicating the node has hidden children. */
	collapsed?: boolean;
}

export function Bullet({ collapsed }: BulletProps) {
	return (
		<div {...stylex.props(styles.bullet, collapsed && styles.collapsed)}>
			<div {...stylex.props(styles.dot)} />
		</div>
	);
}
