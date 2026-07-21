import { KeyboardCommandLabel } from "@cascade/ui/keyboard-command-label";
import { CheckIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { useOutlinerLabels } from "../../../labels-context";
import { MAX_TAG_LENGTH } from "../../../node-tags";
import { DeleteTagDialog } from "./delete-tag-dialog";
import {
	charCount,
	checkbox,
	deleteTagButton,
	footer,
	input,
	limitError,
	optionButton,
	optionRow,
	search,
	usageCount,
} from "./styles";
import type { NodeTagsEditorProps } from "./types";
import { useTagEditor } from "./use-tag-editor";

/** Searchable checklist over all of the user's tags. Edit mode manages the
 * tags on a node; filter mode provides selection without management actions. */
export function NodeTagsEditor({
	tags,
	existingTags,
	onChange,
	onDeleteTag,
	mode = "edit",
}: NodeTagsEditorProps) {
	const labels = useOutlinerLabels();
	const filterMode = mode === "filter";
	const [pendingDelete, setPendingDelete] = useState<string | null>(null);
	const {
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
	} = useTagEditor({
		tags,
		existingTags,
		onChange,
		allowCreate: !filterMode,
	});

	return (
		<div className={filterMode ? "px-1 pb-1" : undefined}>
			<div className={search({ compact: filterMode })}>
				<input
					ref={inputRef}
					value={query}
					placeholder={
						filterMode ? labels.filtersSearchTags : labels.tagsInputPlaceholder
					}
					className={input()}
					role="combobox"
					aria-expanded={optionCount > 0}
					aria-invalid={(!filterMode && overLimit) || undefined}
					onClick={(e) => e.stopPropagation()}
					onChange={(e) => {
						setQuery(e.target.value);
						resetHighlight();
					}}
					onKeyDown={handleInputKeyDown}
				/>
				{!filterMode && showCount && (
					<span className={charCount({ over: overLimit })}>
						{trimmedQuery.length}/{MAX_TAG_LENGTH}
					</span>
				)}
			</div>
			{!filterMode && overLimit && (
				<p role="alert" className={limitError()}>
					{labels.tagNameTooLong}
				</p>
			)}
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
								{!filterMode && (
									<span className={usageCount()}>{tag.count}</span>
								)}
							</button>
							{!filterMode && onDeleteTag && (
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
						<KeyboardCommandLabel>↑↓</KeyboardCommandLabel>{" "}
						{labels.tagHintNavigate}
					</span>
					<span>
						<KeyboardCommandLabel>↵</KeyboardCommandLabel>{" "}
						{labels.tagHintToggle}
					</span>
				</div>
			)}
			{!filterMode && onDeleteTag && (
				<DeleteTagDialog
					tagName={pendingDelete}
					onOpenChange={(open) => {
						if (!open) setPendingDelete(null);
					}}
					onConfirm={onDeleteTag}
				/>
			)}
		</div>
	);
}
