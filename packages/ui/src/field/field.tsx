import { Field as Base } from "@base-ui/react/field";
import {
	colors,
	fontSize,
	radius,
	shadow,
	space,
} from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { Ref } from "react";

const styles = stylex.create({
	root: {
		display: "flex",
		flexDirection: "column",
		gap: space["1"],
	},
	label: {
		fontSize: fontSize["300"],
		fontWeight: 500,
		color: colors.muted,
	},
	control: {
		padding: space["2"],
		border: "none",
		borderRadius: radius.md,
		backgroundColor: colors.white,
		boxShadow: {
			default: `inset 0 0 0 1px ${colors.borderStrong}`,
			":focus": shadow.focusRing,
		},
		outline: "none",
		font: "inherit",
		fontSize: fontSize["500"],
		color: colors.ink,
		"::placeholder": { color: colors.placeholder },
	},
});

export interface FieldProps
	extends Omit<Base.Control.Props, "className" | "style" | "ref"> {
	label: string;
	ref?: Ref<HTMLInputElement>;
}

export function Field({ label, ref, ...props }: FieldProps) {
	return (
		<Base.Root {...stylex.props(styles.root)}>
			<Base.Label {...stylex.props(styles.label)}>{label}</Base.Label>
			<Base.Control ref={ref} {...props} {...stylex.props(styles.control)} />
		</Base.Root>
	);
}
