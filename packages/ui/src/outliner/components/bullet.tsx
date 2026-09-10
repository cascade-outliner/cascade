import { colors } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { bulletVars } from "../vars.stylex";

const styles = stylex.create({
	hitArea: {
		position: "relative",
		display: "inline-flex",
		width: 18,
		height: 18,
		flexShrink: 0,
		cursor: "pointer",
		userSelect: "none",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 9999,
		padding: 0,
		[bulletVars.overlayOpacity]: {
			default: "0",
			":hover": "0.5",
			":focus-visible": "0.5",
		},
		[bulletVars.dotColor]: {
			default: colors.muted,
			":hover": colors.ink,
			":focus-visible": colors.ink,
		},
	},
	overlay: {
		position: "absolute",
		inset: 0,
		borderRadius: 9999,
		backgroundColor: colors.muted,
		opacity: bulletVars.overlayOpacity,
	},
	dot: {
		position: "absolute",
		top: "50%",
		left: "50%",
		width: 9,
		height: 9,
		transform: "translate(-50%, -50%)",
		borderRadius: 9999,
		backgroundColor: bulletVars.dotColor,
	},
});

export function Bullet({ style }: { style?: stylex.StyleXStyles }) {
	return (
		<button type="button" {...stylex.props(styles.hitArea, style)}>
			<span {...stylex.props(styles.overlay)} />
			<span {...stylex.props(styles.dot)} />
		</button>
	);
}
