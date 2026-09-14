import { Input } from "@base-ui/react/input";
import {
	colors,
	fontSize,
	radius,
	shadow,
	space,
} from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { Kbd } from "../kbd/kdb.tsx";

const styles = stylex.create({
	bar: {
		display: "flex",
		alignItems: "center",
		gap: space["2.5"],
		marginTop: {
			default: space["8"],
			"@media (max-width: 640px)": space["4"],
		},
		paddingBlock: space["3"],
		paddingInline: `${space["4"]} ${space["3.5"]}`,
		borderRadius: radius.xl,
		border: "none",
		backgroundColor: colors.white,
		boxShadow: shadow.float,
	},
	input: {
		flexGrow: 1,
		minWidth: 0,
		border: "none",
		backgroundColor: "transparent",
		outline: "none",
		color: colors.ink,
		fontSize: {
			default: fontSize["400"],
			"@media (hover: none)": fontSize["600"],
		},
		"::placeholder": {
			color: colors.placeholder,
		},
	},
});

export interface CaptureBarProps {
	onSubmit: (text: string) => void;
}

export function CaptureBar({ onSubmit }: CaptureBarProps) {
	const [value, setValue] = useState("");

	function submit() {
		const text = value.trim();
		if (!text) return;
		onSubmit(text);
		setValue("");
	}

	return (
		<div {...stylex.props(styles.bar)}>
			<Input
				{...stylex.props(styles.input)}
				value={value}
				onValueChange={setValue}
				onKeyDown={(event) => {
					if (event.key === "Enter") submit();
				}}
				placeholder="Type a node…"
				aria-label="Add a node"
			/>
			<Kbd>⏎</Kbd>
		</div>
	);
}
