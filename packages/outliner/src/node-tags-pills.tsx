import { cva } from "@cascade/ui/cva.config";
import { Popover, PopoverContent, PopoverTrigger } from "@cascade/ui/popover";
import { PlusIcon, TagIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "./labels-context";
import { NodeTagsEditor } from "./node-tags-editor";

interface NodeTagsControlProps {
	tags: string[];
	existingTags: string[];
	onChange: (tags: string[]) => void;
	onDeleteTag: (name: string) => void | Promise<void>;
}

const MAX_VISIBLE_TAGS = 4;

const pill = cva({
	base: [
		"inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium",
		"border-dark-grey/15 bg-transparent text-graphite dark:border-ginger/15 dark:text-ginger/60",
	],
});

const addTrigger = cva({
	base: [
		"inline-flex shrink-0 items-center justify-center rounded-full border border-dashed size-5 outline-none",
		"border-dark-grey/25 text-graphite/70",
		"opacity-0 transition-opacity group-hover/node:opacity-100 group-focus-within/node:opacity-100 pointer-coarse:opacity-100 data-popup-open:opacity-100",
		"hover:border-redleather/50 hover:text-redleather hover:bg-redleather/5",
		"focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-redleather/50",
		"dark:border-ginger/25 dark:text-ginger/60 dark:hover:border-redleather/40 dark:hover:text-redleather",
	],
});

const overflowTrigger = cva({
	base: [
		"inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium outline-none tabular-nums",
		"border-dark-grey/15 bg-transparent text-graphite dark:border-ginger/15 dark:text-ginger/60",
		"hover:border-redleather/50 hover:text-redleather",
		"focus-visible:ring-2 focus-visible:ring-redleather/50",
		"dark:hover:border-redleather/40 dark:hover:text-redleather",
	],
});

const overflowLabel = cva({
	base: [
		"inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11.5px] font-medium tabular-nums",
		"border-dark-grey/15 bg-transparent text-graphite dark:border-ginger/15 dark:text-ginger/60",
	],
});

/**
 * Read-only tag pills for a tree row; adding/removing tags happens via the
 * row's right-click "Tags" menu, not here.
 */
export function NodeTagPills({ tags }: { tags: string[] }) {
	const visible = tags.slice(0, MAX_VISIBLE_TAGS);
	const hidden = tags.slice(MAX_VISIBLE_TAGS);
	if (visible.length === 0) return null;

	return (
		<span className="inline-flex shrink-0 flex-wrap items-center gap-1">
			{visible.map((tag) => (
				<span key={tag} className={pill()}>
					<TagIcon size={11} weight="bold" />
					{tag}
				</span>
			))}
			{hidden.length > 0 && (
				<span className={overflowLabel()} title={hidden.join(", ")}>
					+{hidden.length}
				</span>
			)}
		</span>
	);
}

/**
 * Tag pills plus a hover-revealed "+" that opens the tag editor directly
 * (used where there's no right-click menu to host it, e.g. the detail page).
 */
export function NodeTagsControl({
	tags,
	existingTags,
	onChange,
	onDeleteTag,
}: NodeTagsControlProps) {
	const labels = useOutlinerLabels();
	const visible = tags.slice(0, MAX_VISIBLE_TAGS);
	const hiddenCount = tags.length - visible.length;

	return (
		<Popover>
			<span className="inline-flex shrink-0 flex-wrap items-center gap-1">
				{visible.map((tag) => (
					<span key={tag} className={pill()}>
						<TagIcon size={11} weight="bold" />
						{tag}
					</span>
				))}
				{hiddenCount > 0 ? (
					<PopoverTrigger
						className={overflowTrigger()}
						aria-label={labels.manageTags}
						onClick={(e) => e.stopPropagation()}
					>
						+{hiddenCount}
					</PopoverTrigger>
				) : (
					<PopoverTrigger
						className={addTrigger()}
						aria-label={tags.length > 0 ? labels.manageTags : labels.addTag}
						onClick={(e) => e.stopPropagation()}
					>
						<PlusIcon size={10} weight="bold" />
					</PopoverTrigger>
				)}
			</span>
			<PopoverContent>
				<NodeTagsEditor
					tags={tags}
					existingTags={existingTags}
					onChange={onChange}
					onDeleteTag={onDeleteTag}
				/>
			</PopoverContent>
		</Popover>
	);
}
