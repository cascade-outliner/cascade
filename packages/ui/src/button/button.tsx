import { Button as BaseButton } from "@base-ui/react/button";
import {
	colors,
	fontSize,
	opacity,
	radius,
	shadow,
	space,
} from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { Ref } from "react";

const styles = stylex.create({
	base: {
		border: "none",
		font: "inherit",
		cursor: { default: "pointer", ":disabled": "not-allowed" },
		opacity: { default: 1, ":disabled": opacity.disabled },
		display: "inline-flex",
		alignItems: "center",
		gap: space["1"],
		paddingBlock: "5px",
		paddingInline: space["3"],
		borderRadius: radius.md,
		outline: "none",
		fontSize: fontSize["300"],
		fontWeight: 500,
		whiteSpace: "nowrap",
	},
	secondary: {
		backgroundColor: { default: colors.white, ":hover": colors.surface },
		boxShadow: {
			default: `inset 0 0 0 1px ${colors.borderStrong}`,
			":focus-visible": shadow.focusRing,
		},
		color: colors.ink,
	},
	primary: {
		backgroundColor: colors.primary,
		boxShadow: { default: "none", ":focus-visible": shadow.focusRing },
		color: colors.onPrimary,
	},
});

export interface ButtonProps
	extends Omit<BaseButton.Props, "className" | "style"> {
	ref?: Ref<HTMLButtonElement>;
	variant?: "primary" | "secondary";
}

export function Button({ variant = "secondary", ...props }: ButtonProps) {
	return (
		<BaseButton
			type="button"
			{...props}
			{...stylex.props(styles.base, styles[variant])}
		/>
	);
}
