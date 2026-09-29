import { textState } from "@cascade/data";
import { colors, fontSize, space } from "@cascade/theme/tokens.stylex";
import { Button } from "@cascade/ui/button";
import { CheckIcon, SparkleIcon, XIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useEffect, useRef } from "react";
import { Drafts } from "#/components/split-tasks/drafts.tsx";
import { Marked } from "#/components/split-tasks/marked.tsx";
import {
	addTasks,
	CANT_SPLIT,
	splitTasks,
	useSplit,
} from "#/components/split-tasks/split.ts";
import { useOutlineStore } from "#/lib/outline-store.tsx";

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";
const dashed = `color-mix(in srgb, ${colors.primary} 55%, transparent)`;

const pulse = stylex.keyframes({
	"0%, 100%": { opacity: 0.4 },
	"50%": { opacity: 1 },
});

const styles = stylex.create({
	preview: {
		paddingTop: space["2.5"],
		paddingBottom: space["2"],
		outline: "none",
	},
	original: {
		paddingInline: space["3"],
		paddingBlock: space["1"],
		fontSize: fontSize["400"],
		lineHeight: 1.55,
		color: colors.muted,
	},
	underline: {
		textDecorationLine: "underline",
		textDecorationColor: dashed,
		textUnderlineOffset: 3,
		transition: {
			default: "text-decoration-color 400ms ease",
			[REDUCED_MOTION]: "none",
		},
		"@starting-style": {
			textDecorationColor: "transparent",
		},
	},
	actions: {
		display: "flex",
		alignItems: "center",
		gap: space["2"],
		paddingTop: space["2.5"],
		paddingLeft: space["8"],
		paddingRight: space["3"],
		minHeight: 24,
		fontSize: fontSize["200"],
		color: colors.muted,
	},
	notice: {
		fontSize: fontSize["300"],
		color: colors.muted,
		borderWidth: 4,
		borderTopWidth: 0,
		borderBottomWidth: 0,
		borderRightWidth: 0,
		borderStyle: "solid",
		borderColor: colors.primary,
		paddingLeft: space["3"],
	},
	loading: {
		display: "flex",
		alignItems: "center",
		gap: space["1.5"],
		color: colors.primary,
	},
	pulse: {
		animationName: { default: pulse, [REDUCED_MOTION]: "none" },
		animationDuration: "1.2s",
		animationIterationCount: "infinite",
		animationTimingFunction: "ease-in-out",
	},
});

export interface CaptureSplitProps {
	/** What was typed in the capture bar. */
	text: string;
	/** Where the capture bar adds nodes. */
	parentId: string | null;
	onClose: () => void;
	/** Esc: nothing is added; the caller hands `text` back to the capture bar. */
	onCancel: () => void;
}

/**
 * 3a: previews a captured line split into dashed tasks, inside the capture bar.
 * Tab accepts (a titled parent with the tasks under it), Backspace keeps it as
 * one line, Esc cancels and returns the text to the input.
 */
export function CaptureSplit({
	text,
	parentId,
	onClose,
	onCancel,
}: CaptureSplitProps) {
	const store = useOutlineStore();
	const { result, error } = useSplit(text);
	const ref = useRef<HTMLElement>(null);
	const tasks = splitTasks(result);

	useEffect(() => {
		ref.current?.focus();
	}, []);

	// Esc cancels wherever focus ended up, unless a popup already took the key.
	useHotkey(
		"Escape",
		(event) => {
			if (event.defaultPrevented) return;
			event.preventDefault();
			onCancel();
		},
		{ preventDefault: false, ignoreInputs: false },
	);

	const keepAsOne = () => {
		store.create(parentId, { content: textState(text) });
		onClose();
	};

	const accept = () => {
		if (!result || tasks.length === 0) return;
		const id = store.create(parentId, { content: textState(result.title) });
		addTasks(store, id, tasks);
		onClose();
	};

	return (
		<section
			ref={ref}
			tabIndex={-1}
			aria-label="Split into tasks"
			aria-busy={!result && !error}
			onKeyDown={(event) => {
				if (event.key === "Tab" && !event.shiftKey && tasks.length > 0) {
					event.preventDefault();
					accept();
				} else if (event.key === "Backspace") {
					event.preventDefault();
					keepAsOne();
				}
			}}
			{...stylex.props(styles.preview)}
		>
			<div {...stylex.props(styles.original)}>
				<Marked
					text={text}
					phrases={tasks.map((task) => task.source)}
					style={styles.underline}
				/>
			</div>
			{tasks.length > 0 && <Drafts tasks={tasks} />}
			<div {...stylex.props(styles.actions)}>
				{result ? (
					<>
						{tasks.length > 0 ? (
							<Button variant="primary" size="small" onClick={accept}>
								<CheckIcon size={11} weight="bold" aria-hidden />
								Accept
							</Button>
						) : (
							<span role="status" {...stylex.props(styles.notice)}>
								{CANT_SPLIT}
							</span>
						)}
						<Button size="small" onClick={keepAsOne}>
							<XIcon size={11} weight="bold" aria-hidden />
							Keep as one
						</Button>
					</>
				) : (
					<span {...stylex.props(styles.loading)}>
						<SparkleIcon size={13} {...stylex.props(!error && styles.pulse)} />
						{error ?? "Splitting…"}
					</span>
				)}
			</div>
		</section>
	);
}
