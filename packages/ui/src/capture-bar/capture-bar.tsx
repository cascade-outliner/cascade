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
import { PlusIcon, SparkleIcon, XIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	COMMAND_PRIORITY_LOW,
	KEY_BACKSPACE_COMMAND,
	KEY_ENTER_COMMAND,
	KEY_ESCAPE_COMMAND,
	SKIP_DOM_SELECTION_TAG,
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

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";
/** The editor's line box; the dot, chips and buttons line up with the first one. */
const LINE = 24;

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
		alignItems: "flex-start",
		gap: space["2.5"],
		paddingBlock: space["2.5"],
		paddingInline: `${space["3"]} ${space["2.5"]}`,
		cursor: "text",
	},
	ghost: {
		width: 18,
		height: 18,
		marginTop: (LINE - 18) / 2,
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
		height: LINE,
		paddingBlock: 0,
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
	chip: {
		display: "flex",
		alignItems: "center",
		gap: space["1"],
		flexShrink: 0,
		height: LINE,
		paddingLeft: space["2"],
		paddingRight: space["1"],
		borderRadius: radius.md,
		backgroundColor: colors.primaryMuted,
		color: colors.primary,
		fontSize: fontSize["300"],
		fontWeight: 500,
		whiteSpace: "nowrap",
		"@starting-style": {
			opacity: 0,
			transform: "scale(0.94)",
		},
		transition: {
			default: "opacity 150ms ease, transform 150ms ease",
			[REDUCED_MOTION]: "none",
		},
	},
	chipIcon: {
		display: "flex",
	},
	chipRemove: {
		display: "flex",
		padding: space["0.5"],
		border: "none",
		borderRadius: radius.sm,
		backgroundColor: "transparent",
		color: "inherit",
		cursor: "pointer",
		":hover": {
			backgroundColor: colors.white,
		},
		":focus-visible": {
			outline: "none",
			boxShadow: shadow.focusRing,
		},
	},
	editor: {
		position: "relative",
		flexGrow: 1,
		minWidth: 0,
		maxHeight: "40vh",
		overflowY: "auto",
	},
	editable: {
		outline: "none",
		color: colors.ink,
		fontSize: {
			default: fontSize["400"],
			"@media (hover: none)": fontSize["600"],
		},
		lineHeight: `${LINE}px`,
		whiteSpace: "pre-wrap",
		overflowWrap: "anywhere",
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
		lineHeight: `${LINE}px`,
		whiteSpace: "nowrap",
	},
	// The Add button is a little taller than a line; this centres it on the first.
	add: {
		display: "flex",
		flexShrink: 0,
		marginTop: -2,
	},
});

export interface CaptureBarHandle {
	focus: () => void;
	/** Replaces the text and puts the caret after it, e.g. a cancelled split handing the line back. */
	setText: (text: string) => void;
}

export interface CaptureBarProps<T extends SlashMenuItem = SlashMenuItem> {
	/** Gets the text and the slash commands picked while typing it, in order. */
	onSubmit: (text: string, picked: T[]) => void;
	/**
	 * Offered on "/". A pick stays on the bar as a chip until the text is
	 * submitted, so "/task Buy milk" and "Buy milk /task" both work.
	 */
	slashItems?: readonly T[];
	/** Offers to split the text into tasks (⌘⇧↵). Leave unset to hide it. */
	onSplit?: (text: string) => void;
	/** Shown inside the bar, above the input (e.g. a split preview). It animates open and closed. */
	panel?: ReactNode;
	placeholder?: string;
	ref?: Ref<CaptureBarHandle>;
}

interface KeysPluginProps {
	onEnter: (event: KeyboardEvent) => void;
	onEscape: () => void;
	/** Backspace with nothing to delete, e.g. to drop the last chip. */
	onBackspaceEmpty: () => void;
}

/**
 * Enter, Escape and Backspace, below the slash menu's priority so it takes
 * them while open. Enter submits; Shift+Enter falls through to the editor,
 * which inserts a line break.
 */
function KeysPlugin({ onEnter, onEscape, onBackspaceEmpty }: KeysPluginProps) {
	const [editor] = useLexicalComposerContext();
	useEffect(() => {
		const offBackspace = editor.registerCommand(
			KEY_BACKSPACE_COMMAND,
			() => {
				if ($getRoot().getTextContentSize() > 0) return false;
				onBackspaceEmpty();
				return true;
			},
			COMMAND_PRIORITY_LOW,
		);
		const offEnter = editor.registerCommand(
			KEY_ENTER_COMMAND,
			(event) => {
				if (!event) return false;
				if (event.shiftKey && !(event.metaKey || event.ctrlKey)) return false;
				event.preventDefault();
				onEnter(event);
				return true;
			},
			COMMAND_PRIORITY_LOW,
		);
		const offEscape = editor.registerCommand(
			KEY_ESCAPE_COMMAND,
			(event) => {
				// Claim the key so window-level Escape handlers (outline selection) skip it.
				event?.preventDefault();
				onEscape();
				return true;
			},
			COMMAND_PRIORITY_LOW,
		);
		return () => {
			offBackspace();
			offEnter();
			offEscape();
		};
	}, [editor, onEnter, onEscape, onBackspaceEmpty]);
	return null;
}

interface EditorHandle {
	focus: () => void;
	/** Empties the editor; `keepFocus: false` stops Lexical pulling focus back into it. */
	clear: (keepFocus?: boolean) => void;
	setText: (text: string) => void;
}

interface EditorProps<T extends SlashMenuItem> {
	ref: Ref<EditorHandle>;
	placeholder: string;
	items: readonly T[];
	onSelect: (item: T) => void;
	onTextChange: (text: string) => void;
	onSubmit: () => void;
	onSplit: () => void;
	onEscape: () => void;
	onBackspaceEmpty: () => void;
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
	onBackspaceEmpty,
}: EditorProps<T>) {
	const [editor] = useLexicalComposerContext();
	useImperativeHandle(
		ref,
		() => ({
			focus: () => editor.focus(),
			clear: (keepFocus = true) =>
				editor.update(() => $getRoot().clear(), {
					tag: keepFocus ? undefined : SKIP_DOM_SELECTION_TAG,
				}),
			setText: (text) =>
				editor.update(() => {
					const root = $getRoot();
					root.clear();
					const paragraph = $createParagraphNode();
					paragraph.append($createTextNode(text));
					root.append(paragraph);
					paragraph.selectEnd();
				}),
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
			<OnChangePlugin
				ignoreSelectionChange
				onChange={(state) =>
					onTextChange(state.read(() => $getRoot().getTextContent()))
				}
			/>
			<KeysPlugin
				onEnter={(event) => {
					if (event.shiftKey) onSplit();
					else onSubmit();
				}}
				onEscape={onEscape}
				onBackspaceEmpty={onBackspaceEmpty}
			/>
			<SlashMenuPlugin<T> items={items} onSelect={onSelect} />
		</>
	);
}

export function CaptureBar<T extends SlashMenuItem = SlashMenuItem>({
	onSubmit,
	slashItems = [],
	onSplit,
	panel,
	placeholder = "Capture a thought…",
	ref,
}: CaptureBarProps<T>) {
	const [text, setText] = useState("");
	/** Slash commands picked so far; they apply when the text is submitted. */
	const [picked, setPicked] = useState<T[]>([]);
	const [added, setAdded] = useState(0);
	const editorRef = useRef<EditorHandle>(null);
	const hasText = text.trim() !== "";
	useImperativeHandle(ref, () => ({
		focus: () => editorRef.current?.focus(),
		setText: (text) => editorRef.current?.setText(text),
	}));
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
		onSubmit(trimmed, picked);
		setPicked([]);
		editorRef.current?.clear();
		setAdded((n) => n + 1);
		editorRef.current?.focus();
	}

	function split() {
		const trimmed = text.trim();
		if (!trimmed || !onSplit) return;
		onSplit(trimmed);
		setPicked([]);
		// The split panel takes focus; don't let the editor grab it back.
		editorRef.current?.clear(false);
	}

	function pick(item: T) {
		setPicked((all) => (all.includes(item) ? all : [...all, item]));
	}

	function unpick(item: T) {
		setPicked((all) => all.filter((each) => each !== item));
		editorRef.current?.focus();
	}

	/** Escape: the chips go first, then focus. Typed text is never thrown away. */
	function dismiss() {
		if (picked.length > 0) setPicked([]);
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
				{picked.map((item) => (
					<span
						key={item.id}
						{...stylex.props(styles.chip)}
						data-testid="capture-bar-chip"
					>
						{item.icon && (
							<span {...stylex.props(styles.chipIcon)} aria-hidden>
								{item.icon}
							</span>
						)}
						{item.label}
						<button
							type="button"
							aria-label={`Remove ${item.label}`}
							onClick={() => unpick(item)}
							{...stylex.props(styles.chipRemove)}
						>
							<XIcon size={11} weight="bold" aria-hidden />
						</button>
					</span>
				))}
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
						items={slashItems}
						onSelect={pick}
						onTextChange={setText}
						onSubmit={submit}
						onSplit={split}
						onEscape={dismiss}
						onBackspaceEmpty={() => setPicked((all) => all.slice(0, -1))}
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
				<span {...stylex.props(styles.add)}>
					<Button
						variant="primary"
						disabled={!hasText}
						onClick={submit}
						data-testid="capture-bar-submit"
					>
						<PlusIcon size={14} weight="bold" aria-hidden />
						Add
					</Button>
				</span>
			</div>
		</div>
	);
}
