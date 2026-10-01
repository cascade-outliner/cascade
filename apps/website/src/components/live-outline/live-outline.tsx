import {
	ArrowCounterClockwiseIcon,
	CaretDownIcon,
} from "@phosphor-icons/react";
import type { KeyboardEvent } from "react";
import { css, cva } from "@/styled-system/css";
import { VisuallyHidden } from "../ui/visually-hidden";
import { type OutlineSeed, useOutline } from "./use-outline";

const DEFAULT_SEED: readonly OutlineSeed[] = [
	["Try me. I'm a real outline.", 0],
	["Press Enter to add a thought", 1],
	["Tab tucks it under the one above", 1],
	["Click a bullet to fold everything inside", 1],
	["Like this. Hidden, not gone.", 2],
	["Finally write the novel", 0],
	["Chapter 1: someone wakes up", 1, false, true],
	["Chapter 2: ???", 1],
	["Groceries", 0, true],
	["Oat milk", 1],
	["Coffee, the good kind", 1],
];

const INDENT_PX = 26;

const styles = {
	frame: css({
		backgroundColor: "site.card",
		borderRadius: "18px",
		boxShadow: "site.outline",
		color: "site.ink",
		overflow: "hidden",
		fontFamily: "site.sans",
	}),
	titleBar: css({
		display: "flex",
		alignItems: "center",
		gap: "0.625rem",
		paddingBlock: "0.875rem",
		paddingInline: "1.125rem",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: "site.hairline",
	}),
	mark: css({
		width: "20px",
		height: "20px",
		flexShrink: 0,
		borderRadius: "6px",
		backgroundColor: "site.primary",
		display: "grid",
		placeItems: "center",
	}),
	markDot: css({
		width: "6px",
		height: "6px",
		borderRadius: "50%",
		backgroundColor: "#ffffff",
	}),
	crumbs: css({
		fontFamily: "mono",
		fontSize: "0.72rem",
		fontWeight: 500,
		color: "site.muted",
		whiteSpace: "nowrap",
	}),
	crumbSep: css({ color: "site.onDarkMuted" }),
	crumbHere: css({ color: "site.ink" }),
	reset: css({
		marginInlineStart: "auto",
		display: "inline-flex",
		alignItems: "center",
		gap: "0.25rem",
		paddingBlock: "0.25rem",
		paddingInline: "0.5rem",
		borderRadius: "6px",
		backgroundColor: { base: "transparent", _hover: "site.primaryTint" },
		fontFamily: "mono",
		fontSize: "0.69rem",
		fontWeight: 500,
		color: "site.muted",
		cursor: "pointer",
		whiteSpace: "nowrap",
		outline: "none",
		boxShadow: { base: "none", _focusVisible: "site.focus" },
	}),
	list: css({
		listStyle: "none",
		margin: 0,
		paddingBlockStart: "0.875rem",
		paddingBlockEnd: "0.625rem",
		paddingInline: "0.875rem",
		display: "flex",
		flexDirection: "column",
		gap: "1px",
		minHeight: "300px",
	}),
	hints: css({
		display: "flex",
		flexWrap: "wrap",
		gap: "0.375rem 0.875rem",
		paddingBlockStart: "0.625rem",
		paddingBlockEnd: "0.875rem",
		paddingInline: "1.125rem",
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: "site.hairline",
		fontFamily: "mono",
		fontSize: "0.66rem",
		fontWeight: 500,
		color: "site.muted",
		listStyle: "none",
		margin: 0,
	}),
	hint: css({ whiteSpace: "nowrap" }),
	kbd: css({
		fontFamily: "inherit",
		fontSize: "site.eyebrow",
	}),
};

const row = cva({
	base: {
		display: "flex",
		alignItems: "center",
		gap: "0.375rem",
		paddingBlock: "2px",
		paddingInlineEnd: "0.5rem",
		borderRadius: "9px",
		backgroundColor: "transparent",
	},
	variants: {
		focused: {
			true: { backgroundColor: "site.primaryTint" },
		},
	},
});

const caret = cva({
	base: {
		width: "16px",
		height: "16px",
		flexShrink: 0,
		display: "grid",
		placeItems: "center",
		color: "site.muted",
		cursor: "pointer",
		borderRadius: "4px",
		backgroundColor: "transparent",
		outline: "none",
		boxShadow: { base: "none", _focusVisible: "site.focus" },
		transitionProperty: "transform",
		transitionDuration: { base: "150ms", _motionReduce: "0ms" },
	},
	variants: {
		hidden: {
			true: { visibility: "hidden" },
		},
		folded: {
			true: { transform: "rotate(-90deg)" },
		},
	},
});

const bullet = cva({
	base: {
		width: "20px",
		height: "20px",
		flexShrink: 0,
		borderRadius: "50%",
		display: "grid",
		placeItems: "center",
		cursor: "pointer",
		backgroundColor: "transparent",
		outline: "none",
		boxShadow: { base: "none", _focusVisible: "site.focus" },
	},
	variants: {
		folded: {
			true: { backgroundColor: "rgba(43, 45, 51, 0.14)" },
		},
	},
});

const dot = cva({
	base: {
		width: "6px",
		height: "6px",
		borderRadius: "50%",
		backgroundColor: "site.muted",
	},
	variants: {
		done: {
			true: { backgroundColor: "site.onDarkMuted" },
		},
	},
});

const input = cva({
	base: {
		flex: 1,
		minWidth: 0,
		border: 0,
		outline: "none",
		backgroundColor: "transparent",
		fontFamily: "site.sans",
		fontSize: "0.9375rem",
		lineHeight: 1.5,
		paddingBlock: "5px",
		color: "site.ink",
		_placeholder: { color: "site.faint" },
	},
	variants: {
		top: {
			true: { fontWeight: 600 },
		},
		done: {
			true: {
				color: "site.faint",
				textDecoration: "line-through",
			},
		},
	},
});

export interface LiveOutlineProps {
	seed?: readonly OutlineSeed[];
	/** Where the outline pretends to live, shown in its title bar. */
	path?: readonly [string, string];
}

/** The hero's editable outline. Real editing, no persistence, nothing to lose. */
export function LiveOutline({
	seed = DEFAULT_SEED,
	path = ["Home", "Scratchpad"],
}: LiveOutlineProps) {
	const outline = useOutline(seed);

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>, id: string) => {
		const input = event.currentTarget;
		const caret = input.selectionStart ?? input.value.length;
		switch (event.key) {
			case "Enter":
				event.preventDefault();
				if (event.metaKey || event.ctrlKey) outline.toggleDone(id);
				else outline.split(id, caret);
				return;
			case "Tab":
				event.preventDefault();
				if (event.shiftKey) outline.outdent(id, caret);
				else outline.indent(id, caret);
				return;
			case "Backspace":
				if (input.value === "") {
					event.preventDefault();
					outline.remove(id);
				}
				return;
			case "ArrowUp":
				if (outline.moveFocus(id, -1)) event.preventDefault();
				return;
			case "ArrowDown":
				if (outline.moveFocus(id, 1)) event.preventDefault();
				return;
			default:
		}
	};

	return (
		<div className={styles.frame}>
			<div className={styles.titleBar}>
				<span aria-hidden="true" className={styles.mark}>
					<span className={styles.markDot} />
				</span>
				<span className={styles.crumbs}>
					{path[0]} <span className={styles.crumbSep}>/</span>{" "}
					<span className={styles.crumbHere}>{path[1]}</span>
				</span>
				<button type="button" onClick={outline.reset} className={styles.reset}>
					<ArrowCounterClockwiseIcon size={11} aria-hidden="true" />
					reset
				</button>
			</div>
			<ol aria-label="Editable outline" className={styles.list}>
				{outline.rows.map(({ node, hasChildren, folded }) => {
					const focused = outline.focusedId === node.id;
					const label = node.text || "empty line";
					return (
						<li
							key={node.id}
							className={row({ focused })}
							style={{ paddingInlineStart: 4 + node.depth * INDENT_PX }}
						>
							<button
								type="button"
								tabIndex={-1}
								aria-hidden={!hasChildren}
								aria-expanded={hasChildren ? !folded : undefined}
								aria-label={`${folded ? "Unfold" : "Fold"} “${label}”`}
								onClick={() => outline.toggleFold(node.id)}
								className={caret({ hidden: !hasChildren, folded })}
							>
								<CaretDownIcon size={11} weight="bold" />
							</button>
							<button
								type="button"
								tabIndex={hasChildren ? 0 : -1}
								aria-hidden={!hasChildren}
								aria-expanded={hasChildren ? !folded : undefined}
								aria-label={`${folded ? "Unfold" : "Fold"} “${label}”`}
								onClick={() => outline.toggleFold(node.id)}
								className={bullet({ folded })}
							>
								<span className={dot({ done: node.done })} />
							</button>
							<input
								ref={outline.registerInput(node.id)}
								value={node.text}
								aria-label={`Outline line, level ${node.depth + 1}${node.done ? ", done" : ""}`}
								placeholder={focused ? "Type anything…" : undefined}
								spellCheck={false}
								autoComplete="off"
								onChange={(event) =>
									outline.setText(node.id, event.target.value)
								}
								onKeyDown={(event) => onKeyDown(event, node.id)}
								onFocus={() => outline.setFocusedId(node.id)}
								className={input({ top: node.depth === 0, done: node.done })}
							/>
						</li>
					);
				})}
			</ol>
			<ul aria-label="Keyboard shortcuts" className={styles.hints}>
				<li className={styles.hint}>
					<kbd className={styles.kbd}>
						↵<VisuallyHidden>Enter</VisuallyHidden>
					</kbd>{" "}
					new line
				</li>
				<li className={styles.hint}>
					<kbd className={styles.kbd}>
						⇥<VisuallyHidden>Tab</VisuallyHidden>
					</kbd>{" "}
					indent
				</li>
				<li className={styles.hint}>
					<kbd className={styles.kbd}>
						⇧⇥<VisuallyHidden>Shift Tab</VisuallyHidden>
					</kbd>{" "}
					outdent
				</li>
				<li className={styles.hint}>
					<kbd className={styles.kbd}>
						⌘↵<VisuallyHidden>Command Enter</VisuallyHidden>
					</kbd>{" "}
					done
				</li>
				<li className={styles.hint}>● click to fold</li>
			</ul>
		</div>
	);
}
