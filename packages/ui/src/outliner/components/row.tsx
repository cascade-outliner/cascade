import {
	colors,
	duration,
	radius,
	shadow,
	space,
} from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	row: {
		position: "relative",
		display: "flex",
		alignItems: "center",
		gap: { default: space["2.5"], "@media (max-width: 640px)": space["2"] },
		paddingBlock: {
			default: space["1.5"],
			"@media (hover: none)": space["2.5"],
		},
		paddingInline: space["2.5"],
		borderRadius: radius.lg,
		transition: `background-color ${duration["50"]} ease-in-out, box-shadow ${duration["50"]} ease-in-out`,
		":hover:not(:focus-within)": {
			backgroundColor: colors.surface,
		},
		":focus-within": {
			backgroundColor: colors.white,
			boxShadow: shadow.focus,
		},
	},
	active: {
		backgroundColor: colors.white,
		boxShadow: shadow.focus,
	},
	// Repeats the row's pseudo-classes: StyleX keeps them per condition, so hover would otherwise win.
	selected: {
		backgroundColor: {
			default: colors.primaryMuted,
			":hover:not(:focus-within)": colors.primaryMuted,
			":focus-within": colors.primaryMuted,
		},
		boxShadow: {
			default: `0 0 0 1px ${colors.primary}`,
			":focus-within": `0 0 0 1px ${colors.primary}`,
		},
	},
});

export interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
	active?: boolean;
	/** Part of a multi-selection. Wins over `active` and hover. */
	selected?: boolean;
	children: React.ReactNode;
}

export function Row({ active, selected, children, ...props }: RowProps) {
	return (
		<div
			{...stylex.props(
				styles.row,
				active && styles.active,
				selected && styles.selected,
			)}
			{...props}
		>
			{children}
		</div>
	);
}
