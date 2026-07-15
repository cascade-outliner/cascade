import { Combobox } from "@base-ui/react";
import { cva } from "@cascade/ui/cva.config";
import { XIcon } from "@phosphor-icons/react/ssr";
import { type KeyboardEvent, useState } from "react";
import { useOutlinerLabels } from "./labels-context";
import { normalizeTags } from "./node-tags";

interface NodeTagsEditorProps {
	tags: string[];
	onChange: (tags: string[]) => void;
}

const inputGroup = cva({
	base: [
		"w-56 cursor-text rounded-md border px-2 py-1.5",
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

export function NodeTagsEditor({ tags, onChange }: NodeTagsEditorProps) {
	const labels = useOutlinerLabels();
	const [query, setQuery] = useState("");

	// A plain input, not Combobox.Input: with no popup ever mounted (this
	// editor has no suggestion list), Base UI's Combobox.Input treats Escape
	// as "clear the whole selection" rather than "close the menu", which
	// would wipe every tag. The chip semantics (Root/Chips/Chip/ChipRemove)
	// are unaffected by that and don't have this behavior.
	const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== "Enter") return;
		if (!query.trim()) return;
		event.preventDefault();
		onChange(normalizeTags([...tags, query]));
		setQuery("");
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
						value={query}
						placeholder={tags.length > 0 ? "" : labels.tagsInputPlaceholder}
						className={input()}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={handleInputKeyDown}
					/>
				</Combobox.Chips>
			</Combobox.InputGroup>
		</Combobox.Root>
	);
}
