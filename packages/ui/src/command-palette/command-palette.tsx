import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import type { TextRange } from "@cascade/data";
import { css, cva } from "@cascade/theme/css";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { type KeyboardEvent, type ReactNode, useId, useRef } from "react";

const styles = {
	backdrop: css({
		position: "fixed",
		inset: "0",
		zIndex: "overlay",
		backgroundColor: "overlay",
		_starting: {
			opacity: "hidden",
		},
		transitionProperty: "[opacity]",
		transitionDuration: { base: "150", _motionReduce: "0" },
	}),
	popup: css({
		position: "fixed",
		zIndex: "popup",
		top: "[min(12vh, 96px)]",
		left: "[50%]",
		transform: "translateX(-50%)",
		width: "[min(600px, calc(100vw - 32px))]",
		display: "flex",
		flexDirection: "column",
		maxHeight: "[calc(100dvh - min(12vh, 96px) - 16px)]",
		overflow: "hidden",
		borderRadius: "xl",
		borderWidth: "thin",
		borderStyle: "solid",
		borderColor: "border",
		backgroundColor: "white",
		boxShadow: "popup",
		outline: "none",
		_starting: {
			transform: "translateX(-50%) translateY(-8px)",
			opacity: "hidden",
		},
		transitionProperty: "[transform, opacity]",
		transitionDuration: { base: "150", _motionReduce: "0" },
	}),
	inputRow: css({
		display: "flex",
		alignItems: "center",
		gap: "3",
		paddingBlock: "4",
		paddingInline: "5",
		borderBottomWidth: "thin",
		borderBottomStyle: "solid",
		borderBottomColor: "border",
	}),
	searchIcon: css({
		display: "flex",
		color: "accent",
	}),
	input: css({
		flexGrow: 1,
		minWidth: "0",
		border: "none",
		padding: "0",
		backgroundColor: "transparent",
		outline: "none",
		fontFamily: "inherit",
		fontSize: "600",
		color: "ink",
		caretColor: "accent",
		_placeholder: {
			color: "placeholder",
		},
	}),
	meta: css({
		fontSize: "200",
		whiteSpace: "nowrap",
		color: "placeholder",
	}),
	footer: css({
		display: "flex",
		flexWrap: "wrap",
		gap: "4",
		paddingBlock: "2.5",
		paddingInline: "5",
		borderTopWidth: "thin",
		borderTopStyle: "solid",
		borderTopColor: "border",
		fontSize: "200",
		whiteSpace: "nowrap",
		color: "placeholder",
	}),
	list: css({
		overflowY: "auto",
		overscrollBehavior: "contain",
		padding: "2",
		scrollPaddingBlock: "2",
	}),
	empty: css({
		paddingBlock: "6",
		textAlign: "center",
		fontSize: "400",
		color: "muted",
	}),
	groupLabel: css({
		display: "flex",
		gap: "2",
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
	item: css({
		display: "flex",
		alignItems: "center",
		gap: "3",
		paddingBlock: { base: "2.5", _pointerCoarse: "3" },
		paddingInline: "3",
		borderRadius: "lg",
		color: "ink",
		cursor: "default",
		outline: "none",
		_highlighted: {
			backgroundColor: "primaryMuted",
		},
	}),
	icon: css({
		width: "control.sm",
		height: "control.sm",
		flexShrink: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: "md",
		backgroundColor: "inkSubtle",
		color: "muted",
	}),
	body: css({
		flexGrow: 1,
		minWidth: "0",
	}),
	label: css({
		fontSize: "400",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	}),
	detail: css({
		marginTop: "0.5",
		fontSize: "200",
		color: "placeholder",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	}),
	mark: css({
		backgroundColor: "transparent",
		color: "primary",
		fontWeight: 600,
	}),
	shortcut: css({
		fontSize: "200",
		whiteSpace: "nowrap",
		color: "placeholder",
	}),
	scope: css({
		marginLeft: "auto",
	}),
	visuallyHidden: css({
		position: "absolute",
		width: "hairline",
		height: "hairline",
		overflow: "hidden",
		clipPath: "inset(50%)",
		whiteSpace: "nowrap",
	}),
};

const enter = cva({
	base: {
		display: "none",
		fontSize: "200",
		color: "primary",
	},
	variants: {
		shown: {
			true: { display: "inline" },
		},
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
			<mark key={start} className={styles.mark}>
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
				<Dialog.Backdrop className={styles.backdrop} />
				<Dialog.Popup
					className={styles.popup}
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
						<div className={styles.inputRow}>
							<span className={styles.searchIcon}>
								<MagnifyingGlassIcon size={16} />
							</span>
							<Autocomplete.Input
								className={styles.input}
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
							{status && <span className={styles.meta}>{status}</span>}
						</div>
						<Dialog.Close className={styles.visuallyHidden}>
							Close command palette
						</Dialog.Close>
						<div className={styles.list}>
							<Autocomplete.Empty>
								<div className={styles.empty}>
									{query.trim() ? "No matches" : "Type to search your outline"}
								</div>
							</Autocomplete.Empty>
							<Autocomplete.List>
								{(group: (typeof visible)[number]) => (
									<Autocomplete.Group key={group.value} items={group.items}>
										<Autocomplete.GroupLabel className={styles.groupLabel}>
											{group.value}
										</Autocomplete.GroupLabel>
										<Autocomplete.Collection>
											{(item: PaletteItem) => (
												<Autocomplete.Item
													key={item.id}
													value={item}
													onClick={() => select(item)}
													className={styles.item}
													render={(props, state) => (
														<div {...props}>
															{item.icon && (
																<span className={styles.icon}>{item.icon}</span>
															)}
															<div className={styles.body}>
																<div className={styles.label}>
																	<Highlight
																		text={item.label}
																		ranges={item.ranges}
																	/>
																</div>
																{item.detail && (
																	<div className={styles.detail}>
																		{item.detail}
																	</div>
																)}
															</div>
															{item.shortcut ? (
																<span className={styles.shortcut}>
																	{item.shortcut}
																</span>
															) : (
																<span
																	className={enter({
																		shown: state.highlighted,
																	})}
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
						<div id={hintsId} className={styles.footer}>
							{hints.map((hint) => (
								<span key={hint}>{hint}</span>
							))}
							{scope && <span className={styles.scope}>{scope}</span>}
						</div>
					</Autocomplete.Root>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
