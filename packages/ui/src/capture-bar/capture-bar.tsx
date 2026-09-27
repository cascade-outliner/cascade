import { Input } from "@base-ui/react/input";
import {
	borderWidth,
	colors,
	duration,
	fontSize,
	radius,
	shadow,
	space,
} from "@cascade/theme/tokens.stylex";
import { PlusIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useId, useRef, useState } from "react";
import { Button } from "../button/button.tsx";

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

const pop = stylex.keyframes({
	"0%": { transform: "scale(1)" },
	"40%": { transform: "scale(1.35)" },
	"100%": { transform: "scale(1)" },
});

const styles = stylex.create({
	bar: {
		display: "flex",
		alignItems: "center",
		gap: space["2.5"],
		marginTop: {
			default: space["8"],
			"@media (max-width: 640px)": space["4"],
		},
		paddingBlock: space["2.5"],
		paddingInline: `${space["3"]} ${space["2.5"]}`,
		borderRadius: radius.xl,
		backgroundColor: colors.white,
		boxShadow: {
			default: shadow.float,
			":focus-within": `${shadow.focus}, ${shadow.float}`,
		},
		cursor: "text",
		transition: `box-shadow ${duration["150"]} ease`,
	},
	ghost: {
		width: 18,
		height: 18,
		flexShrink: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: "50%",
		borderWidth: borderWidth.thick,
		borderStyle: "dashed",
		borderColor: colors.borderStrong,
		backgroundColor: "transparent",
		transition: `background-color ${duration["150"]} ease, border-color ${duration["150"]} ease`,
	},
	ghostFilled: {
		borderColor: "transparent",
		backgroundColor: colors.primaryMuted,
	},
	ghostPop: {
		animationName: { default: pop, [REDUCED_MOTION]: "none" },
		animationDuration: "240ms",
		animationTimingFunction: "ease-out",
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: "50%",
		backgroundColor: colors.primary,
		transform: "scale(0)",
		transition: `transform ${duration["150"]} ease`,
	},
	dotVisible: {
		transform: "scale(1)",
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
	placeholder?: string;
}

export function CaptureBar({
	onSubmit,
	placeholder = "Capture a thought…",
}: CaptureBarProps) {
	const [value, setValue] = useState("");
	const [added, setAdded] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const inputId = useId();
	const hasText = value.trim() !== "";

	function submit() {
		const text = value.trim();
		if (!text) return;
		onSubmit(text);
		setValue("");
		setAdded((n) => n + 1);
		inputRef.current?.focus();
	}

	return (
		// Clicking anywhere on the bar focuses the input.
		<label htmlFor={inputId} {...stylex.props(styles.bar)}>
			<span
				key={added}
				aria-hidden
				{...stylex.props(
					styles.ghost,
					hasText && styles.ghostFilled,
					added > 0 && styles.ghostPop,
				)}
			>
				<span {...stylex.props(styles.dot, hasText && styles.dotVisible)} />
			</span>
			<Input
				ref={inputRef}
				id={inputId}
				data-testid="capture-bar-input"
				{...stylex.props(styles.input)}
				value={value}
				onValueChange={setValue}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						submit();
					} else if (event.key === "Escape") {
						if (value) setValue("");
						else event.currentTarget.blur();
					}
				}}
				placeholder={placeholder}
				aria-label="Add a node"
				enterKeyHint="done"
			/>
			<Button
				variant="primary"
				disabled={!hasText}
				onClick={submit}
				data-testid="capture-bar-submit"
			>
				<PlusIcon size={14} weight="bold" aria-hidden />
				Add
			</Button>
		</label>
	);
}
