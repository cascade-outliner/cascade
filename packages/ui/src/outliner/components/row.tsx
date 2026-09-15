import {
	colors,
	duration,
	radius,
	shadow,
	space,
} from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	row: (viewTransitionName: string = "none") => ({
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
		viewTransitionName,
	}),
	active: {
		backgroundColor: colors.white,
		boxShadow: shadow.focus,
	},
});

export interface RowProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "style"> {
	active?: boolean;
	children: React.ReactNode;
	viewTransitionName?: string;
}

export function Row({
	active,
	children,
	className,
	viewTransitionName,
	...props
}: RowProps) {
	const stylexProps = stylex.props(
		styles.row(viewTransitionName ?? "none"),
		active && styles.active,
	);
	return (
		<div
			{...props}
			{...stylexProps}
			className={[stylexProps.className, className].filter(Boolean).join(" ")}
		>
			{children}
		</div>
	);
}
