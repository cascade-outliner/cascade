import { fonts } from "@cascade/theme/tokens.stylex";
import {
	ArrowCounterClockwiseIcon,
	CaretDownIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import type { KeyboardEvent } from "react";
import { media } from "@/theme/breakpoints.stylex";
import { site, siteFontSize, siteShadow } from "@/theme/site.stylex";
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

const styles = stylex.create({
	frame: {
		backgroundColor: site.card,
		borderRadius: "18px",
		boxShadow: siteShadow.outline,
		color: site.ink,
		overflow: "hidden",
		fontFamily: fonts.app,
	},
	titleBar: {
		display: "flex",
		alignItems: "center",
		gap: "0.625rem",
		paddingBlock: "0.875rem",
		paddingInline: "1.125rem",
		borderBottomWidth: 1,
		borderBottomStyle: "solid",
		borderBottomColor: site.hairline,
	},
	mark: {
		width: 20,
		height: 20,
		flexShrink: 0,
		borderRadius: "6px",
		backgroundColor: site.primary,
		display: "grid",
		placeItems: "center",
	},
	markDot: {
		width: 6,
		height: 6,
		borderRadius: "50%",
		backgroundColor: "#ffffff",
	},
	crumbs: {
		fontFamily: fonts.mono,
		fontSize: "0.72rem",
		fontWeight: 500,
		color: site.muted,
		whiteSpace: "nowrap",
	},
	crumbSep: { color: site.onDarkMuted },
	crumbHere: { color: site.ink },
	reset: {
		marginInlineStart: "auto",
		display: "inline-flex",
		alignItems: "center",
		gap: "0.25rem",
		paddingBlock: "0.25rem",
		paddingInline: "0.5rem",
		borderRadius: "6px",
		backgroundColor: { default: "transparent", ":hover": site.primaryTint },
		fontFamily: fonts.mono,
		fontSize: "0.69rem",
		fontWeight: 500,
		color: site.muted,
		cursor: "pointer",
		whiteSpace: "nowrap",
		outline: "none",
		boxShadow: { default: "none", ":focus-visible": siteShadow.focus },
	},
	list: {
		listStyle: "none",
		margin: 0,
		paddingBlock: "0.875rem 0.625rem",
		paddingInline: "0.875rem",
		display: "flex",
		flexDirection: "column",
		gap: 1,
		minHeight: 300,
	},
	row: {
		display: "flex",
		alignItems: "center",
		gap: "0.375rem",
		paddingBlock: 2,
		paddingInlineEnd: "0.5rem",
		borderRadius: "9px",
		backgroundColor: "transparent",
	},
	rowFocused: {
		backgroundColor: site.primaryTint,
	},
	indent: (depth: number) => ({
		paddingInlineStart: 4 + depth * INDENT_PX,
	}),
	caret: {
		width: 16,
		height: 16,
		flexShrink: 0,
		display: "grid",
		placeItems: "center",
		color: site.muted,
		cursor: "pointer",
		borderRadius: "4px",
		backgroundColor: "transparent",
		outline: "none",
		boxShadow: { default: "none", ":focus-visible": siteShadow.focus },
		transitionProperty: "transform",
		transitionDuration: { default: "150ms", [media.reducedMotion]: "0ms" },
	},
	caretHidden: {
		visibility: "hidden",
	},
	caretFolded: {
		transform: "rotate(-90deg)",
	},
	bullet: {
		width: 20,
		height: 20,
		flexShrink: 0,
		borderRadius: "50%",
		display: "grid",
		placeItems: "center",
		cursor: "pointer",
		backgroundColor: "transparent",
		outline: "none",
		boxShadow: { default: "none", ":focus-visible": siteShadow.focus },
	},
	bulletFolded: {
		backgroundColor: "rgba(43, 45, 51, 0.14)",
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: "50%",
		backgroundColor: site.muted,
	},
	dotDone: {
		backgroundColor: site.onDarkMuted,
	},
	input: {
		flex: 1,
		minWidth: 0,
		border: 0,
		outline: "none",
		backgroundColor: "transparent",
		fontFamily: fonts.app,
		fontSize: "0.9375rem",
		lineHeight: 1.5,
		paddingBlock: 5,
		color: site.ink,
		"::placeholder": { color: site.faint },
	},
	inputTop: { fontWeight: 600 },
	inputDone: {
		color: site.faint,
		textDecoration: "line-through",
	},
	hints: {
		display: "flex",
		flexWrap: "wrap",
		gap: "0.375rem 0.875rem",
		paddingBlock: "0.625rem 0.875rem",
		paddingInline: "1.125rem",
		borderTopWidth: 1,
		borderTopStyle: "solid",
		borderTopColor: site.hairline,
		fontFamily: fonts.mono,
		fontSize: "0.66rem",
		fontWeight: 500,
		color: site.muted,
		listStyle: "none",
		margin: 0,
	},
	hint: { whiteSpace: "nowrap" },
	kbd: {
		fontFamily: "inherit",
		fontSize: siteFontSize.eyebrow,
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
		<div {...stylex.props(styles.frame)}>
			<div {...stylex.props(styles.titleBar)}>
				<span aria-hidden="true" {...stylex.props(styles.mark)}>
					<span {...stylex.props(styles.markDot)} />
				</span>
				<span {...stylex.props(styles.crumbs)}>
					{path[0]} <span {...stylex.props(styles.crumbSep)}>/</span>{" "}
					<span {...stylex.props(styles.crumbHere)}>{path[1]}</span>
				</span>
				<button
					type="button"
					onClick={outline.reset}
					{...stylex.props(styles.reset)}
				>
					<ArrowCounterClockwiseIcon size={11} aria-hidden="true" />
					reset
				</button>
			</div>
			<ol aria-label="Editable outline" {...stylex.props(styles.list)}>
				{outline.rows.map(({ node, hasChildren, folded }) => {
					const focused = outline.focusedId === node.id;
					const label = node.text || "empty line";
					return (
						<li
							key={node.id}
							{...stylex.props(
								styles.row,
								styles.indent(node.depth),
								focused && styles.rowFocused,
							)}
						>
							<button
								type="button"
								tabIndex={-1}
								aria-hidden={!hasChildren}
								aria-expanded={hasChildren ? !folded : undefined}
								aria-label={`${folded ? "Unfold" : "Fold"} “${label}”`}
								onClick={() => outline.toggleFold(node.id)}
								{...stylex.props(
									styles.caret,
									!hasChildren && styles.caretHidden,
									folded && styles.caretFolded,
								)}
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
								{...stylex.props(styles.bullet, folded && styles.bulletFolded)}
							>
								<span
									{...stylex.props(styles.dot, node.done && styles.dotDone)}
								/>
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
								{...stylex.props(
									styles.input,
									node.depth === 0 && styles.inputTop,
									node.done && styles.inputDone,
								)}
							/>
						</li>
					);
				})}
			</ol>
			<ul aria-label="Keyboard shortcuts" {...stylex.props(styles.hints)}>
				<li {...stylex.props(styles.hint)}>
					<kbd {...stylex.props(styles.kbd)}>
						↵<VisuallyHidden>Enter</VisuallyHidden>
					</kbd>{" "}
					new line
				</li>
				<li {...stylex.props(styles.hint)}>
					<kbd {...stylex.props(styles.kbd)}>
						⇥<VisuallyHidden>Tab</VisuallyHidden>
					</kbd>{" "}
					indent
				</li>
				<li {...stylex.props(styles.hint)}>
					<kbd {...stylex.props(styles.kbd)}>
						⇧⇥<VisuallyHidden>Shift Tab</VisuallyHidden>
					</kbd>{" "}
					outdent
				</li>
				<li {...stylex.props(styles.hint)}>
					<kbd {...stylex.props(styles.kbd)}>
						⌘↵<VisuallyHidden>Command Enter</VisuallyHidden>
					</kbd>{" "}
					done
				</li>
				<li {...stylex.props(styles.hint)}>● click to fold</li>
			</ul>
		</div>
	);
}
