import { Button as BaseButton } from "@base-ui/react/button";
import { css } from "@cascade/theme/css";
import type { Ref } from "react";

const styles = {
	base: css.raw({
		border: "none",
		font: "inherit",
		cursor: { base: "pointer", _disabled: "not-allowed" },
		opacity: { base: 1, _disabled: "disabled" },
		display: "inline-flex",
		alignItems: "center",
		gap: "1",
		paddingBlock: "5px",
		paddingInline: "3",
		borderRadius: "md",
		outline: "none",
		fontSize: "300",
		fontWeight: 500,
		whiteSpace: "nowrap",
	}),
	small: css.raw({
		paddingBlock: "2px",
		paddingInline: "2",
		fontSize: "200",
	}),
	secondary: css.raw({
		backgroundColor: { base: "white", _hover: "surface" },
		boxShadow: {
			base: "inset 0 0 0 1px token(colors.borderStrong)",
			_focusVisible: "focusRing",
		},
		color: "ink",
	}),
	primary: css.raw({
		backgroundColor: "primary",
		boxShadow: { base: "none", _focusVisible: "focusRing" },
		color: "onPrimary",
	}),
};

export interface ButtonProps
	extends Omit<BaseButton.Props, "className" | "style"> {
	ref?: Ref<HTMLButtonElement>;
	variant?: "primary" | "secondary";
	size?: "default" | "small";
}

export function Button({
	variant = "secondary",
	size = "default",
	...props
}: ButtonProps) {
	return (
		<BaseButton
			type="button"
			{...props}
			className={css(
				styles.base,
				size === "small" && styles.small,
				styles[variant],
			)}
		/>
	);
}
