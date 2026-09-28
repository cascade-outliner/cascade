import {
	borderWidth,
	colors,
	duration,
	fontSize,
	radius,
	shadow,
	space,
	zIndex,
} from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import {
	groupSlashMenuItems,
	type SlashMenuGroup,
	type SlashMenuItem,
} from "./filter.ts";

/** The popup's tallest, for callers that pick a side by the room they have. */
export const SLASH_MENU_MAX_HEIGHT = 320;

const styles = stylex.create({
	popup: {
		position: "absolute",
		top: 0,
		left: 0,
		zIndex: zIndex.popup,
		width: 280,
		maxWidth: "calc(100vw - 32px)",
		maxHeight: SLASH_MENU_MAX_HEIGHT,
		overflowY: "auto",
		overscrollBehavior: "contain",
		padding: space["1.5"],
		scrollPaddingBlock: space["1.5"],
		borderRadius: radius.lg,
		borderWidth: borderWidth.thin,
		borderStyle: "solid",
		borderColor: colors.border,
		backgroundColor: colors.white,
		boxShadow: shadow.popup,
		outline: "none",
		"@starting-style": {
			opacity: 0,
			transform: "translateY(-4px)",
		},
		transitionProperty: "transform, opacity",
		transitionDuration: duration["100"],
	},
	groupLabel: {
		paddingTop: space["2"],
		paddingBottom: space["1"],
		paddingInline: space["3"],
		fontSize: fontSize["200"],
		letterSpacing: "0.08em",
		textTransform: "uppercase",
		color: colors.placeholder,
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
	},
	item: {
		display: "flex",
		alignItems: "center",
		gap: space["3"],
		paddingBlock: { default: space["2"], "@media (hover: none)": space["3"] },
		paddingInline: space["3"],
		borderRadius: radius.md,
		fontSize: fontSize["500"],
		color: colors.ink,
		cursor: "default",
		outline: "none",
	},
	highlighted: {
		backgroundColor: colors.primaryMuted,
	},
	danger: {
		color: colors.danger,
	},
	icon: {
		width: 22,
		height: 22,
		flexShrink: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: radius.md,
		backgroundColor: colors.inkSubtle,
		color: colors.muted,
	},
	dangerIcon: {
		color: colors.danger,
	},
	body: {
		flexGrow: 1,
		minWidth: 0,
	},
	label: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	description: {
		marginTop: space["0.5"],
		fontSize: fontSize["200"],
		color: colors.placeholder,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	enter: {
		fontSize: fontSize["200"],
		color: colors.primary,
	},
	footer: {
		display: "flex",
		gap: space["3"],
		marginTop: space["1"],
		paddingTop: space["2"],
		paddingBottom: space["1"],
		paddingInline: space["3"],
		borderTopWidth: borderWidth.thin,
		borderTopStyle: "solid",
		borderTopColor: colors.border,
		fontSize: fontSize["200"],
		color: colors.placeholder,
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
	/** Where the popup sits; by default the top-left of its positioned parent. */
	style?: stylex.StyleXStyles;
}

/**
 * The list a slash command menu shows: grouped items with one highlighted.
 * Keys are the caller's; this only renders and reports hovers and clicks.
 * Rendered inside Lexical's listbox anchor, so it holds groups, not another listbox.
 */
export function SlashMenu<T extends SlashMenuItem>({
	items,
	highlightedIndex,
	onHighlight,
	onSelect,
	itemRef,
	style,
}: SlashMenuProps<T>) {
	const groups: SlashMenuGroup<T>[] = groupSlashMenuItems(items);
	let index = -1;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: not a control; only keeps focus (and the caret) in the editor while picking with the mouse.
		<div
			{...stylex.props(styles.popup, style)}
			data-testid="slash-menu"
			onMouseDown={(event) => event.preventDefault()}
		>
			{groups.map((group) => (
				<div key={group.label}>
					<div {...stylex.props(styles.groupLabel)} aria-hidden>
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
			<div {...stylex.props(styles.footer)} aria-hidden>
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
			{...stylex.props(
				styles.item,
				highlighted && styles.highlighted,
				item.danger && styles.danger,
			)}
			onMouseEnter={() => onHighlight(index)}
			onClick={() => onSelect(item)}
		>
			{item.icon && (
				<span {...stylex.props(styles.icon, item.danger && styles.dangerIcon)}>
					{item.icon}
				</span>
			)}
			<div {...stylex.props(styles.body)}>
				<div {...stylex.props(styles.label)}>{item.label}</div>
				{item.description && (
					<div {...stylex.props(styles.description)}>{item.description}</div>
				)}
			</div>
			{highlighted && (
				<span {...stylex.props(styles.enter)} aria-hidden>
					⏎
				</span>
			)}
		</div>
	);
}
