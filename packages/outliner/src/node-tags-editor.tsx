import { AlertDialog } from "@base-ui/react";
import { cva } from "@cascade/ui/cva.config";
import { PlusIcon, TagIcon, TrashIcon, XIcon } from "@phosphor-icons/react/ssr";
import { type KeyboardEvent, useMemo, useRef, useState } from "react";
import { useOutlinerLabels } from "./labels-context";
import { normalizeTags } from "./node-tags";

interface NodeTagsEditorProps {
	tags: string[];
	/** This user's other tag names, for the suggestion list (already sorted). */
	existingTags: string[];
	onChange: (tags: string[]) => void;
	/** Deletes the tag outright (every node that has it loses it), not just
	 * this node's use of it. Omit to hide the delete affordance. */
	onDeleteTag?: (name: string) => void | Promise<void>;
}

const MAX_SUGGESTIONS = 6;

const inputGroup = cva({
	base: [
		"flex w-64 cursor-text flex-wrap items-center gap-1 rounded-md border px-2 py-1.5",
		"border-dark-grey/15 focus-within:ring-2 focus-within:ring-redleather/50",
		"dark:border-ginger/15",
	],
});

const chip = cva({
	base: [
		"flex shrink-0 items-center gap-1 rounded-full border py-1 pl-2.5 pr-1 text-[11.5px] font-medium",
		"border-peach/50 bg-peach/25 text-dark-grey dark:border-peach/40 dark:bg-peach/20 dark:text-ginger",
	],
});

const chipRemove = cva({
	base: [
		"flex size-4 cursor-pointer items-center justify-center rounded-full outline-none",
		"hover:bg-dark-grey/10 focus-visible:ring-2 focus-visible:ring-redleather/50 dark:hover:bg-ginger/15",
	],
});

const input = cva({
	base: [
		"min-w-16 flex-1 bg-transparent text-sm outline-none",
		"text-dark-grey placeholder:text-graphite/60 dark:text-ginger dark:placeholder:text-ginger/40",
	],
});

const groupLabel = cva({
	base: "px-2 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-graphite/75 dark:text-ginger/50",
});

const optionRow = cva({
	base: [
		"group/option flex w-full items-center gap-1 rounded-md pr-1 pl-2 text-sm outline-none",
		"text-dark-grey dark:text-ginger hover:bg-ginger/70 dark:hover:bg-ginger/20",
	],
	variants: {
		// Keyboard-driven (arrow keys), independent of CSS :hover above, so a
		// stationary mouse resting over a suggestion can't silently hijack
		// what Enter does while the user is typing something else.
		highlighted: {
			true: "bg-ginger/70 dark:bg-ginger/20",
			false: "",
		},
	},
});

const optionButton = cva({
	base: "flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1.5 text-left outline-none",
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

	const suggestions = useMemo(() => {
		const q = trimmedQuery.toLowerCase();
		return existingTags
			.filter((t) => !currentLower.has(t.toLowerCase()))
			.filter((t) => q === "" || t.toLowerCase().includes(q))
			.slice(0, MAX_SUGGESTIONS);
	}, [existingTags, currentLower, trimmedQuery]);

	const canCreate =
		trimmedQuery !== "" &&
		!currentLower.has(trimmedQuery.toLowerCase()) &&
		!existingTags.some((t) => t.toLowerCase() === trimmedQuery.toLowerCase());

	// Keyboard-navigable options: existing-tag suggestions, then an optional
	// trailing "create new" row when the typed text doesn't match anything.
	const optionCount = suggestions.length + (canCreate ? 1 : 0);

	const addTag = (name: string) => {
		onChange(normalizeTags([...tags, name]));
		setQuery("");
		setHighlighted(-1);
		inputRef.current?.focus();
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
				setHighlighted(-1);
			}
			return;
		}
		if (event.key !== "Enter") return;
		event.preventDefault();
		if (highlighted >= 0 && highlighted < suggestions.length) {
			addTag(suggestions[highlighted]);
		} else if (trimmedQuery) {
			// Covers both the highlighted "create new" row and plain Enter.
			addTag(trimmedQuery);
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
			{/* A label so clicking anywhere in the bordered box focuses the input. */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: not an action — it only stops the click reaching the hosting context menu, which would close it. */}
			<label className={inputGroup()} onClick={(e) => e.stopPropagation()}>
				{tags.map((tag) => (
					<span key={tag} className={chip()}>
						{tag}
						<button
							type="button"
							className={chipRemove()}
							aria-label={`${labels.removeTagAria}: ${tag}`}
							onClick={() => onChange(tags.filter((t) => t !== tag))}
						>
							<XIcon size={9} weight="bold" />
						</button>
					</span>
				))}
				<input
					ref={inputRef}
					value={query}
					placeholder={tags.length > 0 ? "" : labels.tagsInputPlaceholder}
					className={input()}
					role="combobox"
					aria-expanded={optionCount > 0}
					onChange={(e) => {
						setQuery(e.target.value);
						setHighlighted(-1);
					}}
					onKeyDown={handleInputKeyDown}
				/>
			</label>
			{optionCount > 0 && (
				<div className="mt-1 max-h-48 overflow-y-auto">
					{suggestions.length > 0 && (
						<>
							<div className={groupLabel()}>{labels.tagSuggestions}</div>
							{suggestions.map((tag, i) => (
								<div
									key={tag}
									className={optionRow({ highlighted: i === highlighted })}
								>
									<button
										type="button"
										className={optionButton()}
										onClick={() => addTag(tag)}
									>
										<TagIcon size={12} weight="bold" className="shrink-0" />
										<span className="truncate">{tag}</span>
									</button>
									{onDeleteTag && (
										<button
											type="button"
											className={deleteTagButton()}
											aria-label={`${labels.deleteTagAria}: ${tag}`}
											onClick={(e) => {
												e.stopPropagation();
												setPendingDelete(tag);
											}}
										>
											<TrashIcon size={12} weight="bold" />
										</button>
									)}
								</div>
							))}
						</>
					)}
					{canCreate && (
						<button
							type="button"
							className={optionRow({
								highlighted: highlighted === suggestions.length,
							})}
							onClick={() => addTag(trimmedQuery)}
						>
							<span className="flex min-w-0 flex-1 items-center gap-2 py-1.5">
								<PlusIcon size={12} weight="bold" className="shrink-0" />
								<span className="truncate">
									{labels.createTag} &ldquo;{trimmedQuery}&rdquo;
								</span>
							</span>
						</button>
					)}
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
