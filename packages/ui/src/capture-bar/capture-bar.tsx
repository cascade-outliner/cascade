import {
	borderWidth,
	colors,
	duration,
	fontSize,
	radius,
	shadow,
	space,
} from "@cascade/theme/tokens.stylex";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { PlusIcon, SparkleIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
	$createTextNode,
	$getRoot,
	COMMAND_PRIORITY_LOW,
	KEY_ENTER_COMMAND,
	KEY_ESCAPE_COMMAND,
	LineBreakNode,
} from "lexical";
import type { ReactNode, Ref } from "react";
import {
	useEffect,
	useImperativeHandle,
	useReducer,
	useRef,
	useState,
} from "react";
import { Button } from "../button/button.tsx";
import type { SlashMenuItem } from "../slash-menu/filter.ts";
import { SlashMenuPlugin } from "../slash-menu/slash-menu-plugin.tsx";
import { matchSlashTrigger } from "../slash-menu/trigger.ts";

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

const pop = stylex.keyframes({
	"0%": { transform: "scale(1)" },
	"40%": { transform: "scale(1.35)" },
	"100%": { transform: "scale(1)" },
});

const styles = stylex.create({
	bar: {
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
	editor: {
		position: "relative",
		flexGrow: 1,
		minWidth: 0,
	},
	editable: {
		outline: "none",
		color: colors.ink,
		fontSize: {
			default: fontSize["400"],
			"@media (hover: none)": fontSize["600"],
		},
		whiteSpace: "nowrap",
		overflow: "hidden",
	},
	placeholder: {
		position: "absolute",
		top: 0,
		left: 0,
		pointerEvents: "none",
		color: colors.placeholder,
		fontSize: {
			default: fontSize["400"],
			"@media (hover: none)": fontSize["600"],
		},
		whiteSpace: "nowrap",
	},
});

export interface CaptureBarSlashMenu<T extends SlashMenuItem = SlashMenuItem> {
	items: readonly T[];
	/** Gets the picked item and the text before the "/", which the bar then clears. */
	onSelect: (item: T, text: string) => void;
}

export interface CaptureBarHandle {
	focus: () => void;
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
	ref?: Ref<CaptureBarHandle>;
}

/** Keeps the editor to one line: pasted or inserted line breaks become spaces. */
function SingleLinePlugin() {
	const [editor] = useLexicalComposerContext();
	useEffect(
		() =>
			editor.registerNodeTransform(LineBreakNode, (node) =>
				node.replace($createTextNode(" ")),
			),
		[editor],
	);
	return null;
}

interface KeysPluginProps {
	onEnter: (event: KeyboardEvent) => void;
	onEscape: () => void;
}

/**
 * Enter and Escape, below the slash menu's priority so it takes them while
 * open. Enter never inserts a line: the bar submits instead.
 */
function KeysPlugin({ onEnter, onEscape }: KeysPluginProps) {
	const [editor] = useLexicalComposerContext();
	useEffect(() => {
		const offEnter = editor.registerCommand(
			KEY_ENTER_COMMAND,
			(event) => {
				event?.preventDefault();
				if (event) onEnter(event);
				return true;
			},
			COMMAND_PRIORITY_LOW,
		);
		const offEscape = editor.registerCommand(
			KEY_ESCAPE_COMMAND,
			() => {
				onEscape();
				return true;
			},
			COMMAND_PRIORITY_LOW,
		);
		return () => {
			offEnter();
			offEscape();
		};
	}, [editor, onEnter, onEscape]);
	return null;
}

interface EditorHandle {
	focus: () => void;
	clear: () => void;
}

interface EditorProps<T extends SlashMenuItem> {
	ref: Ref<EditorHandle>;
	placeholder: string;
	/** Offered on "/"; nothing when there is no text to act on. */
	items: readonly T[];
	/** Gets the picked item and the text left once the "/query" is gone. */
	onSelect: (item: T, text: string) => void;
	onTextChange: (text: string) => void;
	onSubmit: () => void;
	onSplit: () => void;
	onEscape: () => void;
}

/** The one-line Lexical editor inside the bar, with its plugins. */
function Editor<T extends SlashMenuItem>({
	ref,
	placeholder,
	items,
	onSelect,
	onTextChange,
	onSubmit,
	onSplit,
	onEscape,
}: EditorProps<T>) {
	const [editor] = useLexicalComposerContext();
	useImperativeHandle(
		ref,
		() => ({
			focus: () => editor.focus(),
			clear: () => editor.update(() => $getRoot().clear()),
		}),
		[editor],
	);

	return (
		<>
			<PlainTextPlugin
				contentEditable={
					<div {...stylex.props(styles.editor)}>
						<ContentEditable
							{...stylex.props(styles.editable)}
							data-testid="capture-bar-input"
							aria-label="Add a node"
							aria-placeholder={placeholder}
							enterKeyHint="done"
							placeholder={
								<div {...stylex.props(styles.placeholder)} aria-hidden>
									{placeholder}
								</div>
							}
						/>
					</div>
				}
				ErrorBoundary={LexicalErrorBoundary}
			/>
			<HistoryPlugin />
			<SingleLinePlugin />
			<OnChangePlugin
				ignoreSelectionChange
				onChange={(state) =>
					onTextChange(state.read(() => $getRoot().getTextContent()))
				}
			/>
			<KeysPlugin
				onEnter={(event) => {
					if (event.shiftKey && (event.metaKey || event.ctrlKey)) onSplit();
					else onSubmit();
				}}
				onEscape={onEscape}
			/>
			<SlashMenuPlugin<T>
				items={items}
				onSelect={(item) =>
					onSelect(
						item,
						editor.getEditorState().read(() => $getRoot().getTextContent()),
					)
				}
			/>
		</>
	);
}

export function CaptureBar<T extends SlashMenuItem = SlashMenuItem>({
	onSubmit,
	slashMenu,
	onSplit,
	panel,
	placeholder = "Capture a thought…",
	ref,
}: CaptureBarProps<T>) {
	const [text, setText] = useState("");
	const [added, setAdded] = useState(0);
	const editorRef = useRef<EditorHandle>(null);
	const hasText = text.trim() !== "";
	useImperativeHandle(ref, () => ({
		focus: () => editorRef.current?.focus(),
	}));
	// Commands act on what's being captured, so there is nothing to offer without text.
	const match = matchSlashTrigger(text);
	const beforeSlash = match ? text.slice(0, match.index) : text;
	const items = slashMenu && beforeSlash.trim() ? slashMenu.items : [];
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
		const trimmed = text.trim();
		if (!trimmed) return;
		onSubmit(trimmed);
		editorRef.current?.clear();
		setAdded((n) => n + 1);
		editorRef.current?.focus();
	}

	function split() {
		const trimmed = text.trim();
		if (!trimmed || !onSplit) return;
		onSplit(trimmed);
		editorRef.current?.clear();
	}

	function dismiss() {
		if (hasText) editorRef.current?.clear();
		else (document.activeElement as HTMLElement | null)?.blur();
	}

	return (
		<div {...stylex.props(styles.bar)}>
			<div {...stylex.props(styles.panel, open && styles.panelOpen)}>
				<div
					inert={!open}
					{...stylex.props(styles.panelInner, open && styles.panelInnerOpen)}
				>
					{panel ?? lastPanel.current}
				</div>
			</div>
			<div {...stylex.props(styles.row)}>
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
				<LexicalComposer
					initialConfig={{
						namespace: "capture-bar",
						onError: (error) => {
							throw error;
						},
					}}
				>
					<Editor<T>
						ref={editorRef}
						placeholder={placeholder}
						items={items}
						onSelect={(item, rest) => {
							slashMenu?.onSelect(item, rest.trim());
							editorRef.current?.clear();
							setAdded((n) => n + 1);
						}}
						onTextChange={setText}
						onSubmit={submit}
						onSplit={split}
						onEscape={dismiss}
					/>
				</LexicalComposer>
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
			</div>
		</div>
	);
}
