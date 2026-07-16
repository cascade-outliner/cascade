import { AlertDialog } from "@base-ui/react";
import { cva } from "@cascade/ui/cva.config";
import { CheckIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import { type KeyboardEvent, useMemo, useRef, useState } from "react";
import { useOutlinerLabels } from "./labels-context";
import { normalizeTags, type TagSummary } from "./node-tags";

interface NodeTagsEditorProps {
	tags: string[];
	/** All of this user's tags with usage counts (already sorted by name). */
	existingTags: TagSummary[];
	onChange: (tags: string[]) => void;
	/** Deletes the tag outright (every node that has it loses it), not just
	 * this node's use of it. Omit to hide the delete affordance. */
	onDeleteTag?: (name: string) => void | Promise<void>;
}

const search = cva({
	base: [
		"mb-1 w-64 rounded-md border px-2 py-1.5",
		"border-dark-grey/15 focus-within:ring-2 focus-within:ring-redleather/50",
		"dark:border-ginger/15",
	],
});

const input = cva({
	base: [
		"w-full bg-transparent text-sm outline-none",
		"text-dark-grey placeholder:text-graphite/60 dark:text-ginger dark:placeholder:text-ginger/40",
	],
});

const optionRow = cva({
	base: [
		"group/option flex w-full items-center gap-1 rounded-md pr-1 pl-1 text-sm outline-none",
		"text-dark-grey dark:text-ginger hover:bg-ginger/70 dark:hover:bg-ginger/20",
	],
	variants: {
		// Keyboard-driven (arrow keys), independent of CSS :hover above, so a
		// stationary mouse resting over an option can't silently hijack what
		// Enter does while the user is typing something else.
		highlighted: {
			true: "bg-ginger/70 dark:bg-ginger/20",
			false: "",
		},
	},
});

const optionButton = cva({
	base: "flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1.5 text-left outline-none",
});

const checkbox = cva({
	base: "flex size-4 shrink-0 items-center justify-center rounded border",
	variants: {
		checked: {
			true: "border-redleather bg-redleather text-super-ginger",
			false: "border-dark-grey/30 dark:border-ginger/30",
		},
	},
});

const usageCount = cva({
	base: "ml-auto shrink-0 text-[11px] tabular-nums text-graphite/70 dark:text-ginger/50",
});

const deleteTagButton = cva({
	base: [
		"flex shrink-0 items-center justify-center rounded-md size-6 outline-none cursor-pointer",
		"opacity-0 group-hover/option:opacity-100 focus-visible:opacity-100",
		"text-graphite/60 hover:bg-redleather/10 hover:text-redleather",
		"focus-visible:ring-2 focus-visible:ring-redleather/50",
		"dark:text-ginger/50 dark:hover:bg-redleather/15",
	],
});

const footer = cva({
	base: [
		"mt-1 flex gap-3 border-t px-1 pt-1.5 text-[10.5px]",
		"border-dark-grey/10 text-graphite/75 dark:border-ginger/10 dark:text-ginger/50",
	],
});

const kbd = cva({
	base: [
		"rounded border px-1 font-mono text-[9.5px]",
		"border-dark-grey/20 bg-dark-grey/5 dark:border-ginger/20 dark:bg-ginger/10",
	],
});

/**
 * One checklist over all of the user's tags: checked = on this node. Typing
 * filters the list; when the query matches nothing exactly, a "create" row is
 * offered first.
 */
export function NodeTagsEditor({
	tags,
	existingTags,
	onChange,
	onDeleteTag,
}: NodeTagsEditorProps) {
	const labels = useOutlinerLabels();
	const [query, setQuery] = useState("");
	const [highlighted, setHighlighted] = useState(-1);
	const [pendingDelete, setPendingDelete] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const trimmedQuery = query.trim();
	const currentLower = useMemo(
		() => new Set(tags.map((t) => t.toLowerCase())),
		[tags],
	);

	// The suggestion list can lag an optimistic add of a brand-new tag, so
	// merge in this node's own tags; they're on at least this node.
	const allTags = useMemo(() => {
		const known = new Set(existingTags.map((t) => t.name.toLowerCase()));
		const missing = tags
			.filter((t) => !known.has(t.toLowerCase()))
			.map((name) => ({ name, count: 1 }));
		return [...missing, ...existingTags];
	}, [existingTags, tags]);

	const items = useMemo(() => {
		const q = trimmedQuery.toLowerCase();
		return q === ""
			? allTags
			: allTags.filter((t) => t.name.toLowerCase().includes(q));
	}, [allTags, trimmedQuery]);

	const canCreate =
		trimmedQuery !== "" &&
		!allTags.some((t) => t.name.toLowerCase() === trimmedQuery.toLowerCase());

	// Keyboard-navigable options: an optional leading "create new" row when
	// the typed text matches no tag exactly, then the (filtered) checklist.
	const createOffset = canCreate ? 1 : 0;
	const optionCount = items.length + createOffset;

	const resetHighlight = () => setHighlighted(-1);

	const createTag = () => {
		onChange(normalizeTags([...tags, trimmedQuery]));
		setQuery("");
		resetHighlight();
		inputRef.current?.focus();
	};

	const toggleTag = (name: string) => {
		onChange(
			currentLower.has(name.toLowerCase())
				? tags.filter((t) => t.toLowerCase() !== name.toLowerCase())
				: normalizeTags([...tags, name]),
		);
		// Reset the filter so the next keystroke starts a fresh search and the
		// full list reflects the toggle just made.
		setQuery("");
		resetHighlight();
		inputRef.current?.focus();
	};

	const activateOption = (index: number) => {
		if (canCreate && index === 0) createTag();
		else if (items[index - createOffset])
			toggleTag(items[index - createOffset].name);
	};

	const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		// The context menu's typeahead (jump to a menu item by typing its first
		// letter) listens on this popup and calls preventDefault() for every
		// printable-character keydown, with no awareness that focus might be
		// inside this text field — which silently ate every keystroke typed
		// here. Stop those specifically before they can reach that listener;
		// Escape is deliberately left alone so it still closes the menu (its
		// dismiss listener lives on `document`, outside this component tree).
		if (event.key.length === 1) {
			event.stopPropagation();
		}

		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			if (optionCount === 0) return;
			event.preventDefault();
			const step = event.key === "ArrowDown" ? 1 : -1;
			setHighlighted((i) => Math.max(-1, Math.min(i + step, optionCount - 1)));
			return;
		}
		if (event.key === "Escape") {
			if (highlighted !== -1) {
				event.stopPropagation();
				resetHighlight();
			}
			return;
		}
		if (event.key !== "Enter") return;
		event.preventDefault();
		if (highlighted >= 0) {
			activateOption(highlighted);
		} else if (canCreate) {
			createTag();
		} else if (trimmedQuery && items[0]) {
			toggleTag(items[0].name);
		}
	};

	const confirmDelete = async () => {
		if (!pendingDelete) return;
		setIsDeleting(true);
		try {
			await onDeleteTag?.(pendingDelete);
		} finally {
			setIsDeleting(false);
			setPendingDelete(null);
		}
	};

	return (
		<div>
			<div className={search()}>
				<input
					ref={inputRef}
					value={query}
					placeholder={labels.tagsInputPlaceholder}
					className={input()}
					role="combobox"
					aria-expanded={optionCount > 0}
					onClick={(e) => e.stopPropagation()}
					onChange={(e) => {
						setQuery(e.target.value);
						resetHighlight();
					}}
					onKeyDown={handleInputKeyDown}
				/>
			</div>
			<div className="max-h-48 overflow-y-auto">
				{canCreate && (
					<button
						type="button"
						className={optionRow({ highlighted: highlighted === 0 })}
						onClick={() => createTag()}
					>
						<span className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-1">
							<PlusIcon size={12} weight="bold" className="shrink-0" />
							<span className="truncate">
								{labels.createTag} &ldquo;{trimmedQuery}&rdquo;
							</span>
						</span>
					</button>
				)}
				{items.map((tag, i) => {
					const checked = currentLower.has(tag.name.toLowerCase());
					return (
						<div
							key={tag.name}
							className={optionRow({
								highlighted: i + createOffset === highlighted,
							})}
						>
							<button
								type="button"
								className={optionButton()}
								aria-pressed={checked}
								onClick={() => toggleTag(tag.name)}
							>
								<span className={checkbox({ checked })}>
									{checked && <CheckIcon size={10} weight="bold" />}
								</span>
								<span className="truncate">{tag.name}</span>
								<span className={usageCount()}>{tag.count}</span>
							</button>
							{onDeleteTag && (
								<button
									type="button"
									className={deleteTagButton()}
									aria-label={`${labels.deleteTagAria}: ${tag.name}`}
									onClick={(e) => {
										e.stopPropagation();
										setPendingDelete(tag.name);
									}}
								>
									<TrashIcon size={12} weight="bold" />
								</button>
							)}
						</div>
					);
				})}
			</div>
			{optionCount > 0 && (
				<div className={footer()}>
					<span>
						<span className={kbd()}>↑↓</span> {labels.tagHintNavigate}
					</span>
					<span>
						<span className={kbd()}>↵</span> {labels.tagHintToggle}
					</span>
				</div>
			)}
			<AlertDialog.Root
				open={pendingDelete !== null}
				onOpenChange={(open) => {
					if (!open) setPendingDelete(null);
				}}
			>
				<AlertDialog.Portal>
					<AlertDialog.Backdrop className="fixed inset-0 z-50 bg-ginger/20 backdrop-blur-sm" />
					<AlertDialog.Popup
						className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-dark-grey/10 bg-white p-6 text-dark-grey shadow-lg shadow-dark-grey/15 outline-none dark:border-ginger/15 dark:bg-dark-grey dark:text-ginger"
						onClick={(e) => e.stopPropagation()}
					>
						<AlertDialog.Title className="text-lg font-semibold">
							{labels.delete} &ldquo;{pendingDelete}&rdquo;?
						</AlertDialog.Title>
						<AlertDialog.Description className="mt-2 text-sm text-dark-grey dark:text-ginger">
							{labels.deleteTagConfirmBody}
						</AlertDialog.Description>
						<div className="mt-6 flex justify-end gap-2">
							<AlertDialog.Close
								disabled={isDeleting}
								className="cursor-pointer rounded-md px-3 py-1.5 text-sm outline-none hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 disabled:cursor-default disabled:opacity-40 dark:hover:bg-ginger/20"
							>
								{labels.cancel}
							</AlertDialog.Close>
							<button
								type="button"
								onClick={confirmDelete}
								disabled={isDeleting}
								className="cursor-pointer rounded-md bg-redleather px-3 py-1.5 text-sm text-super-ginger outline-none hover:bg-redleather/90 focus-visible:ring-2 focus-visible:ring-redleather/50 disabled:cursor-default disabled:opacity-40"
							>
								{labels.delete}
							</button>
						</div>
					</AlertDialog.Popup>
				</AlertDialog.Portal>
			</AlertDialog.Root>
		</div>
	);
}
