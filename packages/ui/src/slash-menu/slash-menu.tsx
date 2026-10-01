import { css, cva } from "@cascade/theme/css";
import { useLayoutEffect, useRef, useState } from "react";
import {
	groupSlashMenuItems,
	type SlashMenuGroup,
	type SlashMenuItem,
} from "./filter.ts";

const styles = {
	popup: css({
		position: "absolute",
		top: "0",
		left: "0",
		zIndex: "popup",
		width: "popup.md",
		maxWidth: "[calc(100vw - 32px)]",
		maxHeight: "[320px]",
		overflowY: "auto",
		overscrollBehavior: "contain",
		padding: "1.5",
		scrollPaddingBlock: "1.5",
		borderRadius: "lg",
		borderWidth: "thin",
		borderStyle: "solid",
		borderColor: "border",
		backgroundColor: "white",
		boxShadow: "popup",
		outline: "none",
		_starting: {
			opacity: "hidden",
			transform: "translateY(-4px)",
		},
		transitionProperty: "[transform, opacity]",
		transitionDuration: "100",
	}),
	groupLabel: css({
		paddingTop: "2",
		paddingBottom: "1",
		paddingInline: "3",
		fontSize: "200",
		letterSpacing: "0.08em",
		textTransform: "uppercase",
		color: "placeholder",
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
	}),
	body: css({
		flexGrow: 1,
		minWidth: "0",
	}),
	label: css({
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	}),
	description: css({
		marginTop: "0.5",
		fontSize: "200",
		color: "placeholder",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	}),
	enter: css({
		fontSize: "200",
		color: "primary",
	}),
	footer: css({
		display: "flex",
		gap: "3",
		marginTop: "1",
		paddingTop: "2",
		paddingBottom: "1",
		paddingInline: "3",
		borderTopWidth: "thin",
		borderTopStyle: "solid",
		borderTopColor: "border",
		fontSize: "200",
		color: "placeholder",
	}),
};

const option = cva({
	base: {
		display: "flex",
		alignItems: "center",
		gap: "3",
		paddingBlock: { base: "2", _pointerCoarse: "3" },
		paddingInline: "3",
		borderRadius: "md",
		fontSize: "500",
		color: "ink",
		cursor: "default",
		outline: "none",
	},
	variants: {
		highlighted: {
			true: { backgroundColor: "primaryMuted" },
		},
		danger: {
			true: { color: "danger" },
		},
	},
});

const icon = cva({
	base: {
		width: "control.sm",
		height: "control.sm",
		flexShrink: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: "md",
		backgroundColor: "inkSubtle",
		color: "muted",
	},
	variants: {
		danger: {
			true: { color: "danger" },
		},
	},
});

/** Matches the id LexicalMenu points `aria-activedescendant` at. */
export function slashMenuItemId(index: number): string {
	return `typeahead-item-${index}`;
}

export interface SlashMenuProps<T extends SlashMenuItem> {
	/** Already filtered and ordered; rendered grouped, in this order. */
	items: readonly T[];
	/** Index into `items`, or `null` for none. */
	highlightedIndex: number | null;
	onHighlight: (index: number) => void;
	onSelect: (item: T) => void;
	/** Lets the keyboard scroll the highlighted item into view. */
	itemRef?: (item: T, element: HTMLElement | null) => void;
}

/** Space to keep from the window's edge and from the caret's line. */
const MARGIN = 8;

/**
 * How far to raise the popup so it opens above the caret instead of below:
 * `0` when it fits below. `anchor` is Lexical's typeahead anchor, a box one
 * line high sitting just under the caret, which Lexical only flips for
 * multi-line editors.
 */
function liftToFit(popup: HTMLElement, anchor: HTMLElement): number {
	const box = anchor.getBoundingClientRect();
	const height = popup.offsetHeight;
	const fitsBelow = box.top + height + MARGIN <= window.innerHeight;
	const lift = height + box.height + MARGIN;
	const fitsAbove = box.top - lift >= MARGIN;
	return !fitsBelow && fitsAbove ? lift : 0;
}

/**
 * The list a slash command menu shows: grouped items with one highlighted.
 * Keys are the caller's; this only renders and reports hovers and clicks.
 * Rendered inside Lexical's listbox anchor, so it holds groups, not another
 * listbox, and it flips above the caret when it would run off the window.
 */
export function SlashMenu<T extends SlashMenuItem>({
	items,
	highlightedIndex,
	onHighlight,
	onSelect,
	itemRef,
}: SlashMenuProps<T>) {
	const groups: SlashMenuGroup<T>[] = groupSlashMenuItems(items);
	const popupRef = useRef<HTMLDivElement>(null);
	const [lift, setLift] = useState(0);
	let index = -1;

	// biome-ignore lint/correctness/useExhaustiveDependencies: the height changes with the items
	useLayoutEffect(() => {
		const popup = popupRef.current;
		if (popup?.parentElement) setLift(liftToFit(popup, popup.parentElement));
	}, [items]);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: not a control; only keeps focus (and the caret) in the editor while picking with the mouse.
		<div
			ref={popupRef}
			className={styles.popup}
			style={lift ? { top: -lift } : undefined}
			data-testid="slash-menu"
			onMouseDown={(event) => event.preventDefault()}
		>
			{groups.map((group) => (
				<div key={group.label}>
					<div className={styles.groupLabel} aria-hidden>
						{group.label}
					</div>
					{group.items.map((item) => {
						index += 1;
						const highlighted = index === highlightedIndex;
						return (
							<SlashMenuOption
								key={item.id}
								item={item}
								index={index}
								highlighted={highlighted}
								onHighlight={onHighlight}
								onSelect={onSelect}
								itemRef={itemRef}
							/>
						);
					})}
				</div>
			))}
			<div className={styles.footer} aria-hidden>
				<span>↑↓ navigate</span>
				<span>⏎ select</span>
				<span>esc dismiss</span>
			</div>
		</div>
	);
}

interface SlashMenuOptionProps<T extends SlashMenuItem> {
	item: T;
	index: number;
	highlighted: boolean;
	onHighlight: (index: number) => void;
	onSelect: (item: T) => void;
	itemRef?: (item: T, element: HTMLElement | null) => void;
}

function SlashMenuOption<T extends SlashMenuItem>({
	item,
	index,
	highlighted,
	onHighlight,
	onSelect,
	itemRef,
}: SlashMenuOptionProps<T>) {
	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: keys stay with the editor, which Lexical turns into highlight moves and Enter.
		<div
			ref={(element) => itemRef?.(item, element)}
			id={slashMenuItemId(index)}
			role="option"
			aria-selected={highlighted}
			tabIndex={-1}
			className={option({ highlighted, danger: item.danger })}
			onMouseEnter={() => onHighlight(index)}
			onClick={() => onSelect(item)}
		>
			{item.icon && (
				<span className={icon({ danger: item.danger })}>{item.icon}</span>
			)}
			<div className={styles.body}>
				<div className={styles.label}>{item.label}</div>
				{item.description && (
					<div className={styles.description}>{item.description}</div>
				)}
			</div>
			{highlighted && (
				<span className={styles.enter} aria-hidden>
					⏎
				</span>
			)}
		</div>
	);
}
