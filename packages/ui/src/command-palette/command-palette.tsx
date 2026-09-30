import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import type { TextRange } from "@cascade/data";
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
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { type KeyboardEvent, type ReactNode, useId, useRef } from "react";

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

const styles = stylex.create({
	backdrop: {
		position: "fixed",
		inset: 0,
		zIndex: zIndex.overlay,
		backgroundColor: colors.overlay,
		"@starting-style": {
			opacity: 0,
		},
		transitionProperty: "opacity",
		transitionDuration: { default: duration["150"], [REDUCED_MOTION]: "0s" },
	},
	popup: {
		position: "fixed",
		zIndex: zIndex.popup,
		top: "min(12vh, 96px)",
		left: "50%",
		transform: "translateX(-50%)",
		width: "min(600px, calc(100vw - 32px))",
		display: "flex",
		flexDirection: "column",
		maxHeight: "calc(100dvh - min(12vh, 96px) - 16px)",
		overflow: "hidden",
		borderRadius: radius.xl,
		borderWidth: borderWidth.thin,
		borderStyle: "solid",
		borderColor: colors.border,
		backgroundColor: colors.white,
		boxShadow: shadow.popup,
		outline: "none",
		"@starting-style": {
			transform: "translateX(-50%) translateY(-8px)",
			opacity: 0,
		},
		transitionProperty: "transform, opacity",
		transitionDuration: { default: duration["150"], [REDUCED_MOTION]: "0s" },
	},
	inputRow: {
		display: "flex",
		alignItems: "center",
		gap: space["3"],
		paddingBlock: space["4"],
		paddingInline: space["5"],
		borderBottomWidth: borderWidth.thin,
		borderBottomStyle: "solid",
		borderBottomColor: colors.border,
	},
	searchIcon: {
		display: "flex",
		color: colors.accent,
	},
	input: {
		flexGrow: 1,
		minWidth: 0,
		border: "none",
		padding: 0,
		backgroundColor: "transparent",
		outline: "none",
		fontFamily: "inherit",
		fontSize: fontSize["600"],
		color: colors.ink,
		caretColor: colors.accent,
		"::placeholder": {
			color: colors.placeholder,
		},
	},
	meta: {
		fontSize: fontSize["200"],
		whiteSpace: "nowrap",
		color: colors.placeholder,
	},
	list: {
		overflowY: "auto",
		overscrollBehavior: "contain",
		padding: space["2"],
		scrollPaddingBlock: space["2"],
	},
	empty: {
		paddingBlock: space["6"],
		textAlign: "center",
		fontSize: fontSize["400"],
		color: colors.muted,
	},
	groupLabel: {
		display: "flex",
		gap: space["2"],
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
		paddingBlock: { default: space["2.5"], "@media (hover: none)": space["3"] },
		paddingInline: space["3"],
		borderRadius: radius.lg,
		color: colors.ink,
		cursor: "default",
		outline: "none",
		"[data-highlighted]": {
			backgroundColor: colors.primaryMuted,
		},
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
	body: {
		flexGrow: 1,
		minWidth: 0,
	},
	label: {
		fontSize: fontSize["400"],
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	detail: {
		marginTop: space["0.5"],
		fontSize: fontSize["200"],
		color: colors.placeholder,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	mark: {
		backgroundColor: "transparent",
		color: colors.primary,
		fontWeight: 600,
	},
	shortcut: {
		fontSize: fontSize["200"],
		whiteSpace: "nowrap",
		color: colors.placeholder,
	},
	enter: {
		display: "none",
		fontSize: fontSize["200"],
		color: colors.primary,
	},
	enterShown: {
		display: "inline",
	},
	footer: {
		display: "flex",
		flexWrap: "wrap",
		gap: space["4"],
		paddingBlock: space["2.5"],
		paddingInline: space["5"],
		borderTopWidth: borderWidth.thin,
		borderTopStyle: "solid",
		borderTopColor: colors.border,
	},
	scope: {
		marginLeft: "auto",
	},
	visuallyHidden: {
		position: "absolute",
		width: 1,
		height: 1,
		overflow: "hidden",
		clipPath: "inset(50%)",
		whiteSpace: "nowrap",
	},
});

export interface PaletteItem {
	id: string;
	label: string;
	/** Spans of `label` to highlight as matched. */
	ranges?: TextRange[];
	/** A second, quieter line, e.g. where a node lives. */
	detail?: string;
	icon?: ReactNode;
	/** Shown on the right. Items without one show ⏎ while highlighted. */
	shortcut?: string;
	onSelect: () => void;
}

export interface PaletteGroup {
	label: string;
	items: PaletteItem[];
}

export interface CommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	query: string;
	onQueryChange: (query: string) => void;
	/** Already filtered and ranked; empty groups are skipped. */
	groups: PaletteGroup[];
	placeholder?: string;
	/** Right of the input, e.g. a result count. */
	status?: ReactNode;
	/** Footer, left to right. */
	hints?: string[];
	/** Footer, pinned right. */
	scope?: ReactNode;
	/** Keys on the input before the palette's own; return `true` to take over (e.g. ⌘⏎). */
	onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => boolean;
}

function Highlight({
	text,
	ranges = [],
}: {
	text: string;
	ranges?: TextRange[];
}) {
	const parts: ReactNode[] = [];
	let at = 0;
	for (const [start, end] of ranges) {
		parts.push(
			text.slice(at, start),
			<mark key={start} {...stylex.props(styles.mark)}>
				{text.slice(start, end)}
			</mark>,
		);
		at = end;
	}
	parts.push(text.slice(at));
	return parts;
}

/**
 * A ⌘K-style dialog: one input over a grouped, keyboard-navigable list.
 * Filtering is the caller's; this only renders it.
 */
export function CommandPalette({
	open,
	onOpenChange,
	query,
	onQueryChange,
	groups,
	placeholder = "Search…",
	status,
	hints = [],
	scope,
	onKeyDown,
}: CommandPaletteProps) {
	const hintsId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const visible = groups
		.filter((group) => group.items.length > 0)
		.map((group) => ({ value: group.label, items: group.items }));

	const select = (item: PaletteItem) => {
		onOpenChange(false);
		item.onSelect();
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop {...stylex.props(styles.backdrop)} />
				<Dialog.Popup
					{...stylex.props(styles.popup)}
					aria-label="Command palette"
					initialFocus={inputRef}
				>
					<Autocomplete.Root
						open
						inline
						mode="none"
						items={visible}
						value={query}
						onValueChange={onQueryChange}
						itemToStringValue={(item: PaletteItem) => item.label}
						autoHighlight="always"
						keepHighlight
					>
						<div {...stylex.props(styles.inputRow)}>
							<span {...stylex.props(styles.searchIcon)}>
								<MagnifyingGlassIcon size={16} />
							</span>
							<Autocomplete.Input
								{...stylex.props(styles.input)}
								ref={inputRef}
								placeholder={placeholder}
								autoFocus
								aria-label="Search nodes"
								aria-describedby={hintsId}
								onKeyDown={(event) => {
									if (onKeyDown?.(event)) {
										event.preventDefault();
										event.preventBaseUIHandler();
									}
								}}
							/>
							{status && <span {...stylex.props(styles.meta)}>{status}</span>}
						</div>
						<Dialog.Close {...stylex.props(styles.visuallyHidden)}>
							Close command palette
						</Dialog.Close>
						<div {...stylex.props(styles.list)}>
							<Autocomplete.Empty>
								<div {...stylex.props(styles.empty)}>
									{query.trim() ? "No matches" : "Type to search your outline"}
								</div>
							</Autocomplete.Empty>
							<Autocomplete.List>
								{(group: (typeof visible)[number]) => (
									<Autocomplete.Group key={group.value} items={group.items}>
										<Autocomplete.GroupLabel
											{...stylex.props(styles.groupLabel)}
										>
											{group.value}
										</Autocomplete.GroupLabel>
										<Autocomplete.Collection>
											{(item: PaletteItem) => (
												<Autocomplete.Item
													key={item.id}
													value={item}
													onClick={() => select(item)}
													{...stylex.props(styles.item)}
													render={(props, state) => (
														<div {...props}>
															{item.icon && (
																<span {...stylex.props(styles.icon)}>
																	{item.icon}
																</span>
															)}
															<div {...stylex.props(styles.body)}>
																<div {...stylex.props(styles.label)}>
																	<Highlight
																		text={item.label}
																		ranges={item.ranges}
																	/>
																</div>
																{item.detail && (
																	<div {...stylex.props(styles.detail)}>
																		{item.detail}
																	</div>
																)}
															</div>
															{item.shortcut ? (
																<span {...stylex.props(styles.shortcut)}>
																	{item.shortcut}
																</span>
															) : (
																<span
																	{...stylex.props(
																		styles.enter,
																		state.highlighted && styles.enterShown,
																	)}
																>
																	⏎
																</span>
															)}
														</div>
													)}
												/>
											)}
										</Autocomplete.Collection>
									</Autocomplete.Group>
								)}
							</Autocomplete.List>
						</div>
						<div id={hintsId} {...stylex.props(styles.footer, styles.meta)}>
							{hints.map((hint) => (
								<span key={hint}>{hint}</span>
							))}
							{scope && <span {...stylex.props(styles.scope)}>{scope}</span>}
						</div>
					</Autocomplete.Root>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
