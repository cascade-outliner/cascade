import { Combobox } from "@base-ui/react";
import { cva } from "@cascade/ui/cva.config";
import { PlusIcon, TagIcon, XIcon } from "@phosphor-icons/react/ssr";
import { type KeyboardEvent, useMemo, useRef, useState } from "react";
import { useOutlinerLabels } from "./labels-context";
import { normalizeTags } from "./node-tags";

interface NodeTagsEditorProps {
	tags: string[];
	/** This user's other tag names, for the suggestion list (already sorted). */
	existingTags: string[];
	onChange: (tags: string[]) => void;
}

const MAX_SUGGESTIONS = 6;

const inputGroup = cva({
	base: [
		"w-64 cursor-text rounded-md border px-2 py-1.5",
		"border-dark-grey/15 focus-within:ring-2 focus-within:ring-redleather/50",
		"dark:border-ginger/15",
	],
});

const chips = cva({
	base: "flex w-full flex-wrap items-center gap-1",
});

const chip = cva({
	base: [
		"flex shrink-0 items-center gap-1 rounded-full border py-1 pl-2.5 pr-1 text-[11.5px] font-medium outline-none",
		"border-peach/50 bg-peach/25 text-dark-grey dark:border-peach/40 dark:bg-peach/20 dark:text-ginger",
	],
});

const chipRemove = cva({
	base: [
		"flex size-4 items-center justify-center rounded-full outline-none",
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
		"flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none",
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

export function NodeTagsEditor({
	tags,
	existingTags,
	onChange,
}: NodeTagsEditorProps) {
	const labels = useOutlinerLabels();
	const [query, setQuery] = useState("");
	const [highlighted, setHighlighted] = useState(-1);
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

		if (event.key === "ArrowDown") {
			if (optionCount === 0) return;
			event.preventDefault();
			setHighlighted((i) => Math.min(i + 1, optionCount - 1));
			return;
		}
		if (event.key === "ArrowUp") {
			if (optionCount === 0) return;
			event.preventDefault();
			setHighlighted((i) => Math.max(i - 1, -1));
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
		} else if (highlighted === suggestions.length && canCreate) {
			addTag(trimmedQuery);
		} else if (trimmedQuery) {
			addTag(trimmedQuery);
		}
	};

	return (
		<Combobox.Root
			multiple
			value={tags}
			onValueChange={(next) => onChange(normalizeTags(next))}
		>
			<Combobox.InputGroup
				className={inputGroup()}
				onClick={(e) => e.stopPropagation()}
			>
				<Combobox.Chips className={chips()}>
					{tags.map((tag) => (
						<Combobox.Chip key={tag} className={chip()} aria-label={tag}>
							{tag}
							<Combobox.ChipRemove
								className={chipRemove()}
								aria-label={`${labels.removeTagAria}: ${tag}`}
							>
								<XIcon size={9} weight="bold" />
							</Combobox.ChipRemove>
						</Combobox.Chip>
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
				</Combobox.Chips>
			</Combobox.InputGroup>
			{optionCount > 0 && (
				<div className="mt-1 max-h-48 overflow-y-auto">
					{suggestions.length > 0 && (
						<>
							<div className={groupLabel()}>{labels.tagSuggestions}</div>
							{suggestions.map((tag, i) => (
								<button
									key={tag}
									type="button"
									className={optionRow({ highlighted: i === highlighted })}
									onClick={() => addTag(tag)}
								>
									<TagIcon size={12} weight="bold" className="shrink-0" />
									<span className="truncate">{tag}</span>
								</button>
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
							<PlusIcon size={12} weight="bold" className="shrink-0" />
							<span className="truncate">
								{labels.createTag} &ldquo;{trimmedQuery}&rdquo;
							</span>
						</button>
					)}
				</div>
			)}
		</Combobox.Root>
	);
}
