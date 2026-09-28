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
import { PlusIcon, SparkleIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";
import {
	useEffect,
	useId,
	useLayoutEffect,
	useReducer,
	useRef,
	useState,
} from "react";
import { Button } from "../button/button.tsx";
import type { SlashMenuItem } from "../slash-menu/filter.ts";
import { SLASH_MENU_MAX_HEIGHT, SlashMenu } from "../slash-menu/slash-menu.tsx";
import { useInputSlashMenu } from "../slash-menu/use-input-slash-menu.ts";

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

const pop = stylex.keyframes({
	"0%": { transform: "scale(1)" },
	"40%": { transform: "scale(1.35)" },
	"100%": { transform: "scale(1)" },
});

const styles = stylex.create({
	bar: {
		position: "relative",
		display: "flex",
		flexDirection: "column",
		marginTop: {
			default: space["8"],
			"@media (max-width: 640px)": space["4"],
		},
		borderRadius: radius.xl,
		backgroundColor: colors.white,
		boxShadow: {
			default: shadow.float,
			":focus-within": `${shadow.focus}, ${shadow.float}`,
		},
		transition: `box-shadow ${duration["150"]} ease`,
	},
	// Grows from 0 to its content's height: grid rows can transition, `height: auto` can't.
	panel: {
		display: "grid",
		gridTemplateRows: "0fr",
		transition: {
			default: "grid-template-rows 220ms cubic-bezier(0.2, 0, 0, 1)",
			[REDUCED_MOTION]: "none",
		},
	},
	panelOpen: {
		gridTemplateRows: "1fr",
	},
	panelInner: {
		minHeight: 0,
		overflow: "hidden",
		opacity: 0,
		transition: {
			default: "opacity 160ms ease",
			[REDUCED_MOTION]: "none",
		},
	},
	panelInnerOpen: {
		opacity: 1,
		borderBottomWidth: borderWidth.thin,
		borderBottomStyle: "solid",
		borderBottomColor: colors.border,
	},
	row: {
		display: "flex",
		alignItems: "center",
		gap: space["2.5"],
		paddingBlock: space["2.5"],
		paddingInline: `${space["3"]} ${space["2.5"]}`,
		cursor: "text",
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
	split: {
		display: "flex",
		alignItems: "center",
		gap: space["1.5"],
		flexShrink: 0,
		paddingBlock: space["1"],
		paddingInline: space["2"],
		border: "none",
		borderRadius: radius.md,
		backgroundColor: colors.primaryMuted,
		color: colors.primary,
		fontFamily: "inherit",
		fontSize: fontSize["300"],
		fontWeight: 500,
		whiteSpace: "nowrap",
		cursor: "pointer",
		":focus-visible": {
			outline: "none",
			boxShadow: shadow.focusRing,
		},
		transition: {
			default: "opacity 150ms ease, transform 150ms ease",
			[REDUCED_MOTION]: "none",
		},
		"@starting-style": {
			opacity: 0,
			transform: "scale(0.94)",
		},
	},
	shortcut: {
		fontFamily: "monospace",
		fontSize: fontSize["200"],
	},
	// The bar is sticky at the bottom of long outlines, and just under the rows of short ones.
	slashMenuAbove: {
		top: "auto",
		bottom: `calc(100% + ${space["2"]})`,
		left: space["3"],
	},
	slashMenuBelow: {
		top: `calc(100% + ${space["2"]})`,
		left: space["3"],
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

export interface CaptureBarSlashMenu<T extends SlashMenuItem = SlashMenuItem> {
	items: readonly T[];
	/** Gets the picked item and the text before the "/", which the bar then clears. */
	onSelect: (item: T, text: string) => void;
}

export interface CaptureBarProps<T extends SlashMenuItem = SlashMenuItem> {
	onSubmit: (text: string) => void;
	/** Offers these on "/" after the text, e.g. "Buy milk /task". Leave unset to disable. */
	slashMenu?: CaptureBarSlashMenu<T>;
	/** Offers to split the text into tasks (⌘⇧↵). Leave unset to hide it. */
	onSplit?: (text: string) => void;
	/** Shown inside the bar, above the input (e.g. a split preview). It animates open and closed. */
	panel?: ReactNode;
	placeholder?: string;
	ref?: Ref<HTMLInputElement>;
}

export function CaptureBar<T extends SlashMenuItem = SlashMenuItem>({
	onSubmit,
	slashMenu,
	onSplit,
	panel,
	placeholder = "Capture a thought…",
	ref,
}: CaptureBarProps<T>) {
	const [value, setValue] = useState("");
	const [added, setAdded] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const barRef = useRef<HTMLDivElement>(null);
	const inputId = useId();
	const hasText = value.trim() !== "";
	const slash = useInputSlashMenu<T>({
		value,
		items: slashMenu?.items ?? [],
		onSelect: (item, text) => {
			slashMenu?.onSelect(item, text);
			setValue("");
			setAdded((n) => n + 1);
		},
	});
	const [slashSide, setSlashSide] = useState<"above" | "below">("above");
	useLayoutEffect(() => {
		const bar = barRef.current;
		if (!slash.open || !bar) return;
		const room = window.innerHeight - bar.getBoundingClientRect().bottom;
		setSlashSide(room >= SLASH_MENU_MAX_HEIGHT + 16 ? "below" : "above");
	}, [slash.open]);
	// Keeps the last panel on screen while it collapses.
	const lastPanel = useRef<ReactNode>(null);
	const [, rerender] = useReducer((n: number) => n + 1, 0);
	if (panel) lastPanel.current = panel;
	const open = !!panel;
	useEffect(() => {
		if (open) return;
		// Just past the collapse transition.
		const timer = setTimeout(() => {
			lastPanel.current = null;
			rerender();
		}, 250);
		return () => clearTimeout(timer);
	}, [open]);

	function submit() {
		const text = value.trim();
		if (!text) return;
		onSubmit(text);
		setValue("");
		setAdded((n) => n + 1);
		inputRef.current?.focus();
	}

	function split() {
		const text = value.trim();
		if (!text || !onSplit) return;
		onSplit(text);
		setValue("");
	}

	function setInputRef(node: HTMLInputElement | null) {
		inputRef.current = node;
		if (typeof ref === "function") ref(node);
		else if (ref) ref.current = node;
	}

	return (
		<div ref={barRef} {...stylex.props(styles.bar)}>
			<div {...stylex.props(styles.panel, open && styles.panelOpen)}>
				<div
					inert={!open}
					{...stylex.props(styles.panelInner, open && styles.panelInnerOpen)}
				>
					{panel ?? lastPanel.current}
				</div>
			</div>
			{/* Clicking anywhere on the row focuses the input. */}
			<label htmlFor={inputId} {...stylex.props(styles.row)}>
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
					ref={setInputRef}
					id={inputId}
					data-testid="capture-bar-input"
					{...stylex.props(styles.input)}
					value={value}
					onValueChange={setValue}
					onKeyDown={(event) => {
						if (slash.onKeyDown(event)) return;
						if (
							event.key === "Enter" &&
							event.shiftKey &&
							(event.metaKey || event.ctrlKey)
						) {
							event.preventDefault();
							split();
						} else if (event.key === "Enter") {
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
				{onSplit && hasText && (
					<button type="button" onClick={split} {...stylex.props(styles.split)}>
						<SparkleIcon size={13} aria-hidden />
						Split
						<span aria-hidden {...stylex.props(styles.shortcut)}>
							⌘⇧↵
						</span>
					</button>
				)}
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
			{slash.open && (
				<SlashMenu
					items={slash.items}
					highlightedIndex={slash.highlightedIndex}
					onHighlight={slash.highlight}
					onSelect={slash.select}
					style={
						slashSide === "above"
							? styles.slashMenuAbove
							: styles.slashMenuBelow
					}
				/>
			)}
		</div>
	);
}
