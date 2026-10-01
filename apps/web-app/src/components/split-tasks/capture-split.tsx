import { textState } from "@cascade/data";
import { Button } from "@cascade/ui/button";
import { CheckIcon, SparkleIcon, XIcon } from "@phosphor-icons/react";
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
import { css, keyframes } from "#/styled-system/css";

const pulse = keyframes({
	"0%, 100%": { opacity: "disabled" },
	"50%": { opacity: "full" },
});

const styles = {
	preview: css({
		paddingTop: "2.5",
		paddingBottom: "2",
		outline: "none",
	}),
	original: css({
		paddingInline: "3",
		paddingBlock: "1",
		fontSize: "400",
		lineHeight: "normal",
		color: "muted",
	}),
	underline: css.raw({
		textDecorationLine: "underline",
		textDecorationColor: "primarySoft",
		textUnderlineOffset: "3px",
		transitionProperty: "[text-decoration-color]",
		transitionDuration: { base: "400", _motionReduce: "0" },
		transitionTimingFunction: "standard",
		_starting: {
			textDecorationColor: "transparent",
		},
	}),
	actions: css({
		display: "flex",
		alignItems: "center",
		gap: "2",
		paddingTop: "2.5",
		paddingLeft: "8",
		paddingRight: "3",
		minHeight: "control.md",
		fontSize: "200",
		color: "muted",
	}),
	notice: css({
		fontSize: "300",
		color: "muted",
		borderWidth: "bar",
		borderTopWidth: "0",
		borderBottomWidth: "0",
		borderRightWidth: "0",
		borderStyle: "solid",
		borderColor: "primary",
		paddingLeft: "3",
	}),
	loading: css({
		display: "flex",
		alignItems: "center",
		gap: "1.5",
		color: "primary",
	}),
	pulse: css({
		animationName: { base: `[${pulse}]` as const, _motionReduce: "[none]" },
		animationDuration: "pulse",
		animationIterationCount: "infinite",
		animationTimingFunction: "inOut",
	}),
};

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
			className={styles.preview}
		>
			<div className={styles.original}>
				<Marked
					text={text}
					phrases={tasks.map((task) => task.source)}
					css={styles.underline}
				/>
			</div>
			{tasks.length > 0 && <Drafts tasks={tasks} />}
			<div className={styles.actions}>
				{result ? (
					<>
						{tasks.length > 0 ? (
							<Button variant="primary" size="small" onClick={accept}>
								<CheckIcon size={11} weight="bold" aria-hidden />
								Accept
							</Button>
						) : (
							<span role="status" className={styles.notice}>
								{CANT_SPLIT}
							</span>
						)}
						<Button size="small" onClick={keepAsOne}>
							<XIcon size={11} weight="bold" aria-hidden />
							Keep as one
						</Button>
					</>
				) : (
					<span className={styles.loading}>
						<SparkleIcon
							size={13}
							className={error ? undefined : styles.pulse}
						/>
						{error ?? "Splitting…"}
					</span>
				)}
			</div>
		</section>
	);
}
