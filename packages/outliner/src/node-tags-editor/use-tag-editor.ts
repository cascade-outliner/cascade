import { type KeyboardEvent, useMemo, useRef, useState } from "react";
import { MAX_TAG_LENGTH, normalizeTags, type TagSummary } from "../node-tags";

interface UseTagEditorOptions {
	tags: string[];
	existingTags: TagSummary[];
	onChange: (tags: string[]) => void;
}

/** Drives the tag combobox: filtering, keyboard nav, and create/toggle. */
export function useTagEditor({
	tags,
	existingTags,
	onChange,
}: UseTagEditorOptions) {
	const [query, setQuery] = useState("");
	const [highlighted, setHighlighted] = useState(-1);
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

	const overLimit = trimmedQuery.length > MAX_TAG_LENGTH;
	// Surface the countdown only once the limit is near, so short tags (the
	// common case) don't carry a permanent counter.
	const showCount = MAX_TAG_LENGTH - trimmedQuery.length <= 15;

	const canCreate =
		trimmedQuery !== "" &&
		!overLimit &&
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

	return {
		query,
		setQuery,
		highlighted,
		inputRef,
		trimmedQuery,
		currentLower,
		items,
		overLimit,
		showCount,
		canCreate,
		createOffset,
		optionCount,
		resetHighlight,
		createTag,
		toggleTag,
		handleInputKeyDown,
	};
}
