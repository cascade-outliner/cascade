import { cva } from "@cascade/ui/cva.config";
import { XIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { useOutlinerLabels } from "./labels-context";
import { normalizeTags } from "./node-tags";

interface NodeTagsEditorProps {
	tags: string[];
	onChange: (tags: string[]) => void;
}

const chip = cva({
	base: [
		"inline-flex shrink-0 items-center gap-1 rounded-full border py-1 pl-2.5 pr-1 text-[11.5px] font-medium",
		"border-peach/50 bg-peach/25 text-dark-grey dark:border-peach/40 dark:bg-peach/20 dark:text-ginger",
	],
});

const input = cva({
	base: [
		"w-full rounded-md border px-2 py-1 text-sm outline-none",
		"border-dark-grey/15 bg-transparent text-dark-grey placeholder:text-graphite/60",
		"dark:border-ginger/15 dark:text-ginger dark:placeholder:text-ginger/40",
		"focus-visible:ring-2 focus-visible:ring-redleather/50",
	],
});

export function NodeTagsEditor({ tags, onChange }: NodeTagsEditorProps) {
	const labels = useOutlinerLabels();
	const [value, setValue] = useState("");

	const addTag = () => {
		if (!value.trim()) return;
		const next = normalizeTags([...tags, value]);
		onChange(next);
		setValue("");
	};

	const removeTag = (tag: string) => {
		onChange(tags.filter((t) => t !== tag));
	};

	return (
		<div className="flex w-56 flex-col gap-2 p-1">
			{tags.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{tags.map((tag) => (
						<span key={tag} className={chip()}>
							{tag}
							<button
								type="button"
								aria-label={`${labels.removeTagAria}: ${tag}`}
								className="flex size-4 items-center justify-center rounded-full outline-none hover:bg-dark-grey/10 focus-visible:ring-2 focus-visible:ring-redleather/50 dark:hover:bg-ginger/15"
								onClick={() => removeTag(tag)}
							>
								<XIcon size={9} weight="bold" />
							</button>
						</span>
					))}
				</div>
			)}
			<input
				type="text"
				value={value}
				placeholder={labels.tagsInputPlaceholder}
				className={input()}
				onChange={(e) => setValue(e.target.value)}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						addTag();
					}
				}}
			/>
		</div>
	);
}
