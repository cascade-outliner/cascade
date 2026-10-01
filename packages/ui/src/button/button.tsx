import { Button as BaseButton } from "@base-ui/react/button";
import { cva } from "@cascade/theme/css";
import type { Ref } from "react";

const button = cva({
	base: {
		border: "none",
		font: "inherit",
		cursor: { base: "pointer", _disabled: "not-allowed" },
		opacity: { base: "full", _disabled: "disabled" },
		display: "inline-flex",
		alignItems: "center",
		gap: "1",
		paddingBlock: "[5px]",
		paddingInline: "3",
		borderRadius: "md",
		outline: "none",
		fontSize: "300",
		fontWeight: 500,
		whiteSpace: "nowrap",
	},
	variants: {
		size: {
			default: {},
			small: {
				paddingBlock: "0.5",
				paddingInline: "2",
				fontSize: "200",
			},
		},
		variant: {
			secondary: {
				backgroundColor: { base: "white", _hover: "surface" },
				boxShadow: {
					base: "hairlineInset",
					_focusVisible: "focusRing",
				},
				color: "ink",
			},
			primary: {
				backgroundColor: "primary",
				boxShadow: { base: "none", _focusVisible: "focusRing" },
				color: "onPrimary",
			},
		},
	},
});

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
			className={button({ variant, size })}
		/>
	);
}
