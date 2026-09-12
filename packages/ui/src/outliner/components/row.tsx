import { colors } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	row: {
		position: "relative",
		display: "flex",
		alignItems: "center",
		gap: 10,
		paddingBlock: 6,
		paddingInline: 10,
		borderRadius: 10,
		transition:
			"background-color 0.05s ease-in-out, box-shadow 0.05s ease-in-out",
		":hover:not(:focus-within)": {
			backgroundColor: colors.surface,
		},
		":focus-within": {
			backgroundColor: colors.white,
			boxShadow:
				"0 0 0 1px rgba(173, 76, 78, 0.3), 0 3px 10px -3px rgba(0, 0, 0, 0.12)",
		},
	},
	active: {
		backgroundColor: colors.white,
		boxShadow:
			"0 0 0 1px rgba(173, 76, 78, 0.3), 0 3px 10px -3px rgba(0, 0, 0, 0.12)",
	},
});

export interface RowProps {
	active?: boolean;
	children: React.ReactNode;
}

export function Row({ active, children }: RowProps) {
	return (
		<div {...stylex.props(styles.row, active && styles.active)}>{children}</div>
	);
}
