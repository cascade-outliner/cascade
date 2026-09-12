import { Input } from "@base-ui/react/input";
import { colors } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { Kbd } from "../kbd/kdb.tsx";

const styles = stylex.create({
	bar: {
		display: "flex",
		alignItems: "center",
		gap: 10,
		marginTop: 32,
		paddingBlock: 11,
		paddingInline: "16px 14px",
		borderRadius: 14,
		border: "none",
		backgroundColor: colors.white,
		boxShadow: "0 10px 30px -8px rgba(0, 0, 0, 0.25)",
	},
	input: {
		flexGrow: 1,
		minWidth: 0,
		border: "none",
		backgroundColor: "transparent",
		outline: "none",
		color: colors.ink,
		fontSize: "0.875rem",
		"::placeholder": {
			color: "#a8a7ad",
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
			/>
			<Kbd>⏎</Kbd>
		</div>
	);
}
