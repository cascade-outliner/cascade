import { css, cva } from "@cascade/theme/css";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import {
	ArrowUpIcon,
	PlusIcon,
	SparkleIcon,
	XIcon,
} from "@phosphor-icons/react";
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
import type { SlashMenuItem } from "../slash-menu/filter.ts";
import { SlashMenu } from "../slash-menu/slash-menu.tsx";
import { SlashMenuPlugin } from "../slash-menu/slash-menu-plugin.tsx";

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
	plusWrap: css({
		position: "relative",
		display: "flex",
		alignSelf: "flex-end",
		flexShrink: 0,
	}),
	menuAnchor: css({
		position: "absolute",
		top: "[100%]",
		left: "0",
		width: "control.xl",
		height: "control.xl",
	}),
	plus: css({
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		alignSelf: "flex-end",
		flexShrink: 0,
		width: "control.xl",
		height: "control.xl",
		padding: "0",
		border: "none",
		borderRadius: "md",
		backgroundColor: "primaryMuted",
		color: "primary",
		cursor: "pointer",
		touchAction: "manipulation",
		outline: "none",
		_active: { backgroundColor: "border" },
		_focusVisible: { boxShadow: "focusRing" },
	}),
	row: css({
		display: "flex",
		alignItems: "flex-start",
		flexWrap: { base: "nowrap", _mobile: "wrap" },
		gap: "2.5",
		paddingBlock: "3",
		paddingInlineStart: "4",
		paddingInlineEnd: "3",
		cursor: "text",
	}),
	chips: css({
		display: "flex",
		alignSelf: "center",
		flexWrap: "wrap",
		gap: "1.5",
		maxWidth: { base: "[55%]", _mobile: "[none]" },
		flexBasis: { base: "auto", _mobile: "[100%]" },
		order: { base: 0, _mobile: -1 },
		paddingBottom: { base: "0", _mobile: "1" },
		flexShrink: 0,
	}),
	splitLabel: css({
		display: { base: "inline", _mobile: "[none]" },
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
		alignSelf: "center",
		flexGrow: 1,
		flexBasis: "0",
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
};

const splitButton = cva({
	base: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		gap: "1.5",
		flexShrink: 0,
		height: "control.xl",
		alignSelf: "flex-end",
		paddingBlock: "0",
		paddingInline: { base: "3", _mobile: "0" },
		width: { base: "auto", _mobile: "control.xl" },
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
		transitionProperty: "[opacity]",
		transitionDuration: { base: "150", _motionReduce: "0" },
		transitionTimingFunction: "standard",
	},
	variants: {
		hidden: {
			true: { opacity: "hidden", pointerEvents: "none" },
		},
	},
});

const add = css({
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	alignSelf: "flex-end",
	flexShrink: 0,
	width: "control.xl",
	height: "control.xl",
	padding: "0",
	border: "none",
	borderRadius: "md",
	backgroundColor: "primary",
	color: "onPrimary",
	font: "inherit",
	fontSize: "300",
	fontWeight: 500,
	whiteSpace: "nowrap",
	outline: "none",
	cursor: "pointer",
	transitionProperty: "[background-color, color]",
	transitionDuration: { base: "150", _motionReduce: "0" },
	transitionTimingFunction: "standard",
	_disabled: {
		backgroundColor: "primaryMuted",
		color: "primary",
		cursor: "not-allowed",
	},
	_focusVisible: { boxShadow: "focusRing" },
});

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
	const menuRef = useRef<HTMLDivElement>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const [highlighted, setHighlighted] = useState<number | null>(null);
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

	useEffect(() => {
		if (!menuOpen) return;
		const close = (event: PointerEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
		};
		document.addEventListener("pointerdown", close);
		return () => document.removeEventListener("pointerdown", close);
	}, [menuOpen]);

	function submit() {
		const trimmed = text.trim();
		if (!trimmed) return;
		onSubmit(trimmed, picked);
		setPicked([]);
		editorRef.current?.clear();
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
		if (menuOpen) setMenuOpen(false);
		else if (picked.length > 0) setPicked([]);
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
				{slashItems.length > 0 && (
					// biome-ignore lint/a11y/noStaticElementInteractions: only closes the menu on Escape while focus is on its button.
					<div
						ref={menuRef}
						className={styles.plusWrap}
						onKeyDown={(event) => {
							if (event.key === "Escape") setMenuOpen(false);
						}}
					>
						<button
							type="button"
							aria-label="Insert command"
							aria-expanded={menuOpen}
							onPointerDown={(event) => event.preventDefault()}
							onClick={() => setMenuOpen((open) => !open)}
							data-testid="capture-bar-plus"
							className={styles.plus}
						>
							<PlusIcon size={16} weight="bold" aria-hidden />
						</button>
						{menuOpen && (
							<span className={styles.menuAnchor}>
								<SlashMenu
									items={slashItems}
									highlightedIndex={highlighted}
									onHighlight={setHighlighted}
									hints={false}
									onSelect={(item) => {
										pick(item);
										setMenuOpen(false);
										editorRef.current?.focus();
									}}
								/>
							</span>
						)}
					</div>
				)}
				{picked.length > 0 && (
					<div className={styles.chips}>
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
					</div>
				)}
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
				{onSplit && (
					<button
						type="button"
						aria-label="Split"
						data-testid="capture-bar-split"
						onClick={split}
						disabled={!hasText}
						aria-hidden={!hasText}
						tabIndex={hasText ? 0 : -1}
						className={splitButton({ hidden: !hasText })}
					>
						<SparkleIcon size={13} aria-hidden />
						<span className={styles.splitLabel}>Split</span>
					</button>
				)}
				<button
					type="button"
					aria-label="Add"
					disabled={!hasText}
					onClick={submit}
					data-testid="capture-bar-submit"
					className={add}
				>
					<ArrowUpIcon size={16} weight="bold" aria-hidden />
				</button>
			</div>
		</div>
	);
}
