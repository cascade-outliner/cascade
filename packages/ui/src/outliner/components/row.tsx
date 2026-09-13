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
		gap: { default: space["10"], "@media (max-width: 640px)": space["8"] },
		paddingBlock: { default: space["6"], "@media (hover: none)": space["9"] },
		paddingInline: space["10"],
		borderRadius: radius.lg,
		transition: `background-color ${duration.instant} ease-in-out, box-shadow ${duration.instant} ease-in-out`,
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
});

export interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
	active?: boolean;
	children: React.ReactNode;
}

export function Row({ active, children, ...props }: RowProps) {
	return (
		<div {...stylex.props(styles.row, active && styles.active)} {...props}>
			{children}
		</div>
	);
}
