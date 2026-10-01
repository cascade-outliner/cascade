import { css, cva, keyframes } from "@cascade/theme/css";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { PlusIcon, SparkleIcon, XIcon } from "@phosphor-icons/react";
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

const pop = keyframes({
	"0%": { transform: "scale(1)" },
	"40%": { transform: "scale(1.35)" },
	"100%": { transform: "scale(1)" },
});

const styles = {
	bar: css({
		display: "flex",
		flexDirection: "column",
		marginTop: { base: "8", _mobile: "4" },
		borderRadius: "xl",
		backgroundColor: "white",
		boxShadow: {
			base: "float",
			_focusWithin: "[token(shadows.focus), token(shadows.float)]",
		},
		transitionProperty: "[box-shadow]",
		transitionDuration: "150",
		transitionTimingFunction: "standard",
	}),
	row: css({
		display: "flex",
		alignItems: "flex-start",
		gap: "2.5",
		paddingBlock: "2.5",
		paddingInlineStart: "3",
		paddingInlineEnd: "2.5",
		cursor: "text",
	}),
	split: css({
		display: "flex",
		alignItems: "center",
		gap: "1.5",
		flexShrink: 0,
		height: "control.md",
		paddingBlock: "0",
		paddingInline: "2",
		border: "none",
		borderRadius: "md",
		backgroundColor: "primaryMuted",
		color: "primary",
		fontFamily: "inherit",
		fontSize: "300",
		fontWeight: 500,
		whiteSpace: "nowrap",
		cursor: "pointer",
		_focusVisible: {
			outline: "none",
			boxShadow: "focusRing",
		},
		transitionProperty: "[opacity, transform]",
		transitionDuration: { base: "150", _motionReduce: "0" },
		transitionTimingFunction: "standard",
		_starting: {
			opacity: "hidden",
			transform: "scale(0.94)",
		},
	}),
	shortcut: css({
		fontFamily: "mono",
		fontSize: "200",
	}),
	chip: css({
		display: "flex",
		alignItems: "center",
		gap: "1",
		flexShrink: 0,
		height: "control.md",
		paddingLeft: "2",
		paddingRight: "1",
		borderRadius: "md",
		backgroundColor: "primaryMuted",
		color: "primary",
		fontSize: "300",
		fontWeight: 500,
		whiteSpace: "nowrap",
		_starting: {
			opacity: "hidden",
			transform: "scale(0.94)",
		},
		transitionProperty: "[opacity, transform]",
		transitionDuration: { base: "150", _motionReduce: "0" },
		transitionTimingFunction: "standard",
	}),
	chipIcon: css({
		display: "flex",
	}),
	chipRemove: css({
		display: "flex",
		padding: "0.5",
		border: "none",
		borderRadius: "sm",
		backgroundColor: "transparent",
		color: "inherit",
		cursor: "pointer",
		_hover: {
			backgroundColor: "white",
		},
		_focusVisible: {
			outline: "none",
			boxShadow: "focusRing",
		},
	}),
	editor: css({
		position: "relative",
		flexGrow: 1,
		minWidth: "0",
		maxHeight: "[40vh]",
		overflowY: "auto",
	}),
	editable: css({
		outline: "none",
		color: "ink",
		fontSize: { base: "400", _pointerCoarse: "600" },
		lineHeight: "line",
		whiteSpace: "pre-wrap",
		overflowWrap: "anywhere",
	}),
	placeholder: css({
		position: "absolute",
		top: "0",
		left: "0",
		pointerEvents: "none",
		color: "placeholder",
		fontSize: { base: "400", _pointerCoarse: "600" },
		lineHeight: "line",
		whiteSpace: "nowrap",
	}),
	// The Add button is a little taller than a line; this centres it on the first.
	add: css({
		display: "flex",
		flexShrink: 0,
		marginTop: "-0.5",
	}),
};

// Grows from 0 to its content's height: grid rows can transition, `height: auto` can't.
const collapsible = cva({
	base: {
		display: "grid",
		gridTemplateRows: "0fr",
		transitionProperty: "[grid-template-rows]",
		transitionDuration: { base: "200", _motionReduce: "0" },
		transitionTimingFunction: "out",
	},
	variants: {
		open: {
			true: { gridTemplateRows: "1fr" },
		},
	},
});

const panelInner = cva({
	base: {
		minHeight: "0",
		overflow: "hidden",
		opacity: "hidden",
		transitionProperty: "[opacity]",
		transitionDuration: { base: "150", _motionReduce: "0" },
		transitionTimingFunction: "standard",
	},
	variants: {
		open: {
			true: {
				opacity: "full",
				borderBottomWidth: "thin",
				borderBottomStyle: "solid",
				borderBottomColor: "border",
			},
		},
	},
});

const ghost = cva({
	base: {
		width: "control.xs",
		height: "control.xs",
		marginTop: "[3px]",
		flexShrink: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: "circle",
		borderWidth: "thick",
		borderStyle: "dashed",
		borderColor: "borderStrong",
		backgroundColor: "transparent",
		transitionProperty: "[background-color, border-color]",
		transitionDuration: "150",
		transitionTimingFunction: "standard",
	},
	variants: {
		filled: {
			true: {
				borderColor: "transparent",
				backgroundColor: "primaryMuted",
			},
		},
		pop: {
			true: {
				animationName: { base: `[${pop}]` as const, _motionReduce: "[none]" },
				animationDuration: "250",
				animationTimingFunction: "enter",
			},
		},
	},
});

const dot = cva({
	base: {
		width: "dot.lg",
		height: "dot.lg",
		borderRadius: "circle",
		backgroundColor: "primary",
		transform: "scale(0)",
		transitionProperty: "[transform]",
		transitionDuration: "150",
		transitionTimingFunction: "standard",
	},
	variants: {
		visible: {
			true: { transform: "scale(1)" },
		},
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
					<div className={styles.editor}>
						<ContentEditable
							className={styles.editable}
							data-testid="capture-bar-input"
							aria-label="Add a node"
							aria-placeholder={placeholder}
							enterKeyHint="done"
							placeholder={
								<div className={styles.placeholder} aria-hidden>
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
		<div className={styles.bar}>
			<div className={collapsible({ open })}>
				<div inert={!open} className={panelInner({ open })}>
					{panel ?? lastPanel.current}
				</div>
			</div>
			<div className={styles.row}>
				<span
					key={added}
					aria-hidden
					className={ghost({ filled: hasText, pop: added > 0 })}
				>
					<span className={dot({ visible: hasText })} />
				</span>
				{picked.map((item) => (
					<span
						key={item.id}
						className={styles.chip}
						data-testid="capture-bar-chip"
					>
						{item.icon && (
							<span className={styles.chipIcon} aria-hidden>
								{item.icon}
							</span>
						)}
						{item.label}
						<button
							type="button"
							aria-label={`Remove ${item.label}`}
							onClick={() => unpick(item)}
							className={styles.chipRemove}
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
					<button type="button" onClick={split} className={styles.split}>
						<SparkleIcon size={13} aria-hidden />
						Split
						<span aria-hidden className={styles.shortcut}>
							⌘⇧↵
						</span>
					</button>
				)}
				<span className={styles.add}>
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
