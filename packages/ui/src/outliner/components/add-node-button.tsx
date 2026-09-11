import { colors } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	button: {
		alignSelf: "flex-start",
		display: "flex",
		alignItems: "center",
		gap: 9,
		paddingBlock: 6,
		paddingInline: 8,
		borderRadius: 10,
		border: "none",
		background: "none",
		color: colors.muted,
		fontSize: "1rem",
		cursor: "pointer",
		":hover": {
			backgroundColor: "rgba(43, 45, 51, 0.05)",
		},
	},
});

export interface AddNodeButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function AddNodeButton({ children, ...props }: AddNodeButtonProps) {
	return (
		<button type="button" {...stylex.props(styles.button)} {...props}>
			{children}
		</button>
	);
}
