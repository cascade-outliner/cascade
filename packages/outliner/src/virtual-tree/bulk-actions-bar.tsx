import { AlertDialog } from "@base-ui/react";
import { Calendar } from "@cascade/ui/calendar";
import { cva } from "@cascade/ui/cva.config";
import { Popover, PopoverContent, PopoverTrigger } from "@cascade/ui/popover";
import {
	CalendarIcon,
	MinusIcon,
	PlusIcon,
	TagIcon,
	TrashIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { useOutlinerLabels } from "../labels-context";
import type { TagSummary } from "../node-tags";

export interface BulkActionsBarProps {
	count: number;
	existingTags: TagSummary[];
	onAddTag: (tag: string) => void;
	onRemoveTag: (tag: string) => void;
	onSetDueDate: (date: Date | null) => void;
	onDelete: () => void;
	onClear: () => void;
}

const bar = cva({
	base: [
		"pointer-events-auto flex items-center gap-1 rounded-full border px-2 py-1.5 shadow-lg",
		"border-ink/10 bg-white text-ink shadow-ink/15",
		"dark:border-surface/15 dark:bg-ink dark:text-surface",
	],
});

const iconButton = cva({
	base: [
		"flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none",
		"text-ink hover:bg-ink/10 focus-visible:ring-2 focus-visible:ring-accent/50",
		"dark:text-surface dark:hover:bg-surface/15",
	],
});

const actionButton = cva({
	base: [
		"flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md bg-ink/5 px-2 py-1.5 text-sm outline-none",
		"hover:bg-ink/10 focus-visible:ring-2 focus-visible:ring-accent/50",
		"disabled:cursor-default disabled:opacity-40",
		"dark:bg-surface/10 dark:hover:bg-surface/20",
	],
});

/** Add-to-selection / remove-from-selection for one tag at a time: unlike
 * the per-node tag editor, a multi-selection has no single "current" tag
 * list to check boxes against, so this is a plain text field plus explicit
 * add/remove buttons. */
function BulkTagPopover({
	existingTags,
	onAdd,
	onRemove,
}: {
	existingTags: TagSummary[];
	onAdd: (tag: string) => void;
	onRemove: (tag: string) => void;
}) {
	const labels = useOutlinerLabels();
	const [query, setQuery] = useState("");
	const trimmed = query.trim();
	const matches =
		trimmed.length > 0
			? existingTags.filter((t) =>
					t.name.toLowerCase().includes(trimmed.toLowerCase()),
				)
			: existingTags;

	return (
		<div className="w-56">
			<input
				// biome-ignore lint/a11y/noAutofocus: opened via an explicit click, so autofocus doesn't steal focus from something the user was already doing
				autoFocus
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				placeholder={labels.bulkTagInputPlaceholder}
				className="mb-2 w-full rounded-md border border-ink/15 bg-transparent px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent/50 dark:border-surface/15"
			/>
			{matches.length > 0 && (
				<div className="mb-2 max-h-32 overflow-y-auto">
					{matches.map((tag) => (
						<button
							key={tag.name}
							type="button"
							onClick={() => setQuery(tag.name)}
							className="block w-full truncate rounded-md px-2 py-1 text-left text-sm hover:bg-surface/70 dark:hover:bg-surface/20"
						>
							{tag.name}
						</button>
					))}
				</div>
			)}
			<div className="flex gap-2">
				<button
					type="button"
					disabled={!trimmed}
					onClick={() => onAdd(trimmed)}
					className={actionButton()}
				>
					<PlusIcon size={12} weight="bold" />
					{labels.bulkAddTagAction}
				</button>
				<button
					type="button"
					disabled={!trimmed}
					onClick={() => onRemove(trimmed)}
					className={actionButton()}
				>
					<MinusIcon size={12} weight="bold" />
					{labels.bulkRemoveTagAction}
				</button>
			</div>
		</div>
	);
}

function BulkDeleteDialog({
	count,
	open,
	onOpenChange,
	onConfirm,
}: {
	count: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}) {
	const labels = useOutlinerLabels();
	return (
		<AlertDialog.Root open={open} onOpenChange={onOpenChange}>
			<AlertDialog.Portal>
				<AlertDialog.Backdrop className="fixed inset-0 z-50 bg-surface/20 backdrop-blur-sm" />
				<AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-ink/10 bg-white p-6 text-ink shadow-lg shadow-ink/15 outline-none dark:border-surface/15 dark:bg-ink dark:text-surface">
					<AlertDialog.Title className="text-lg font-semibold">
						{labels.bulkDeleteConfirmTitle(count)}
					</AlertDialog.Title>
					<AlertDialog.Description className="mt-2 text-sm text-ink dark:text-surface">
						{labels.bulkDeleteConfirmBody}
					</AlertDialog.Description>
					<div className="mt-6 flex justify-end gap-2">
						<AlertDialog.Close className="cursor-pointer rounded-md px-3 py-1.5 text-sm outline-none hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-danger/50 dark:hover:bg-surface/20">
							{labels.cancel}
						</AlertDialog.Close>
						<button
							type="button"
							onClick={() => {
								onConfirm();
								onOpenChange(false);
							}}
							className="cursor-pointer rounded-md bg-danger px-3 py-1.5 text-sm text-canvas outline-none hover:bg-danger/90 focus-visible:ring-2 focus-visible:ring-danger/50"
						>
							{labels.delete}
						</button>
					</div>
				</AlertDialog.Popup>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}

/**
 * Floating action bar for the current multi-selection: tag add/remove, due
 * date, and delete, all applied across every selected row at once. Renders
 * nothing while nothing is selected.
 */
export function BulkActionsBar({
	count,
	existingTags,
	onAddTag,
	onRemoveTag,
	onSetDueDate,
	onDelete,
	onClear,
}: BulkActionsBarProps) {
	const labels = useOutlinerLabels();
	const [deleteOpen, setDeleteOpen] = useState(false);

	if (count === 0) return null;

	return (
		<div className="fixed inset-x-0 bottom-6 z-40 flex justify-center pointer-events-none">
			<div className={bar()}>
				<span className="px-2 text-sm font-medium tabular-nums">
					{labels.selectionCount(count)}
				</span>
				<Popover>
					<PopoverTrigger
						className={iconButton()}
						aria-label={labels.bulkTagsTrigger}
					>
						<TagIcon size={16} weight="bold" />
					</PopoverTrigger>
					<PopoverContent>
						<BulkTagPopover
							existingTags={existingTags}
							onAdd={onAddTag}
							onRemove={onRemoveTag}
						/>
					</PopoverContent>
				</Popover>
				<Popover>
					<PopoverTrigger
						className={iconButton()}
						aria-label={labels.bulkDueDateTrigger}
					>
						<CalendarIcon size={16} weight="bold" />
					</PopoverTrigger>
					<PopoverContent>
						<Calendar
							value={null}
							onSelect={onSetDueDate}
							onClear={() => onSetDueDate(null)}
						/>
					</PopoverContent>
				</Popover>
				<button
					type="button"
					aria-label={labels.bulkDeleteTrigger}
					onClick={() => setDeleteOpen(true)}
					className={iconButton({
						className:
							"hover:bg-danger/10 hover:text-danger dark:hover:bg-danger/15",
					})}
				>
					<TrashIcon size={16} weight="bold" />
				</button>
				<button
					type="button"
					aria-label={labels.clearSelection}
					onClick={onClear}
					className={iconButton()}
				>
					<XIcon size={16} weight="bold" />
				</button>
			</div>
			<BulkDeleteDialog
				count={count}
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				onConfirm={onDelete}
			/>
		</div>
	);
}
