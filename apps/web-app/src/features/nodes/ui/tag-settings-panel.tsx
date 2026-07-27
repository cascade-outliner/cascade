import { AlertDialog } from "@base-ui/react";
import { MAX_TAG_LENGTH, type TagSummary } from "@cascade/outliner/node-tags";
import { Button } from "@cascade/ui/button";
import {
	PencilSimpleIcon,
	PlusIcon,
	TagIcon,
	TrashIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { useTagManagement } from "@/features/nodes/client/tags/use-existing-tags";
import {
	SettingsPageDescription,
	SettingsSection,
} from "@/features/settings/ui/settings-panel";
import {
	alertPopup,
	iconButton,
} from "@/features/user-menu/ui/user-menu.styles";

const tagNameInput =
	"w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-danger/50 dark:border-surface/20 dark:bg-ink dark:text-surface";

function TagRow({
	tag,
	isEditing,
	isRenaming,
	onEdit,
	onCancelEdit,
	onRename,
	onDelete,
	allTags,
}: {
	tag: TagSummary;
	isEditing: boolean;
	isRenaming: boolean;
	onEdit: () => void;
	onCancelEdit: () => void;
	onRename: (newName: string) => void;
	onDelete: () => void;
	allTags: TagSummary[];
}) {
	const [name, setName] = useState(tag.name);
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const trimmedName = name.trim();
	const duplicate = allTags.some(
		(candidate) =>
			candidate.name !== tag.name &&
			candidate.name.toLowerCase() === trimmedName.toLowerCase(),
	);
	const invalid = trimmedName.length === 0 || duplicate;

	useEffect(() => {
		if (isEditing) {
			inputRef.current?.focus();
			inputRef.current?.select();
		}
	}, [isEditing]);

	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (invalid || trimmedName === tag.name) return;
		onRename(trimmedName);
	};

	if (isEditing) {
		return (
			<li className="border-b border-ink/10 px-5 py-4 last:border-b-0 dark:border-surface/15">
				<form onSubmit={submit}>
					<label htmlFor={inputId} className="text-sm font-medium">
						{m.settings_tags_name_label()}
					</label>
					<div className="mt-1.5 flex items-start gap-2">
						<div className="min-w-0 flex-1">
							<input
								ref={inputRef}
								id={inputId}
								value={name}
								maxLength={MAX_TAG_LENGTH}
								onChange={(event) => setName(event.target.value)}
								className={tagNameInput}
							/>
							{duplicate && (
								<p role="alert" className="mt-1 text-xs text-danger">
									{m.settings_tags_name_exists()}
								</p>
							)}
						</div>
						<Button
							type="submit"
							size="sm"
							variant="dark"
							disabled={invalid || trimmedName === tag.name || isRenaming}
						>
							{isRenaming ? m.settings_tags_saving() : m.settings_tags_save()}
						</Button>
						<button
							type="button"
							aria-label={m.user_menu_cancel()}
							className={iconButton({ className: "mt-0.5" })}
							disabled={isRenaming}
							onClick={onCancelEdit}
						>
							<XIcon size={18} weight="bold" />
						</button>
					</div>
				</form>
			</li>
		);
	}

	return (
		<li className="flex min-h-16 items-center gap-3 border-b border-ink/10 px-5 py-3 last:border-b-0 dark:border-surface/15">
			<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface/60 text-ink/60 dark:bg-surface/10 dark:text-surface/60">
				<TagIcon size={18} weight="fill" />
			</div>
			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-medium">{tag.name}</div>
				<div className="text-sm text-ink/55 dark:text-surface/55">
					{m.settings_tags_usage_count({ count: tag.count })}
				</div>
			</div>
			<button
				type="button"
				aria-label={m.settings_tags_edit_label({ name: tag.name })}
				className={iconButton()}
				onClick={onEdit}
			>
				<PencilSimpleIcon size={17} weight="bold" />
			</button>
			<button
				type="button"
				aria-label={m.settings_tags_delete_label({ name: tag.name })}
				className={iconButton({
					className: "text-danger hover:bg-danger/10 dark:hover:bg-danger/15",
				})}
				onClick={onDelete}
			>
				<TrashIcon size={17} weight="bold" />
			</button>
		</li>
	);
}

export function TagSettingsPanel() {
	const {
		tagsQuery,
		createTag,
		isCreatingTag,
		renameTag,
		renamingTag,
		deleteTag,
		deletingTag,
	} = useTagManagement();
	const [newTagName, setNewTagName] = useState("");
	const [editingTag, setEditingTag] = useState<string>();
	const [tagToDelete, setTagToDelete] = useState<TagSummary>();
	const trimmedNewTagName = newTagName.trim();
	const duplicateNewTag =
		tagsQuery.data?.some(
			(tag) => tag.name.toLowerCase() === trimmedNewTagName.toLowerCase(),
		) ?? false;

	const submitNewTag = (event: FormEvent) => {
		event.preventDefault();
		if (!trimmedNewTagName || duplicateNewTag) return;
		createTag(trimmedNewTagName, () => setNewTagName(""));
	};

	return (
		<>
			<SettingsPageDescription>
				{m.settings_tags_description()}
			</SettingsPageDescription>
			<SettingsSection
				title={m.settings_tags_create_section()}
				description={m.settings_tags_create_description()}
			>
				<form
					onSubmit={submitNewTag}
					className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start"
				>
					<div className="min-w-0 flex-1">
						<label htmlFor="new-tag-name" className="sr-only">
							{m.settings_tags_name_label()}
						</label>
						<input
							id="new-tag-name"
							value={newTagName}
							maxLength={MAX_TAG_LENGTH}
							placeholder={m.settings_tags_create_placeholder()}
							onChange={(event) => setNewTagName(event.target.value)}
							className={tagNameInput}
						/>
						{duplicateNewTag && (
							<p role="alert" className="mt-1 text-xs text-danger">
								{m.settings_tags_name_exists()}
							</p>
						)}
					</div>
					<Button
						type="submit"
						size="sm"
						variant="dark"
						icon={<PlusIcon size={15} weight="bold" />}
						disabled={!trimmedNewTagName || duplicateNewTag || isCreatingTag}
					>
						{isCreatingTag
							? m.settings_tags_creating()
							: m.settings_tags_create()}
					</Button>
				</form>
			</SettingsSection>
			<SettingsSection
				title={m.settings_tags_section()}
				description={m.settings_tags_section_description()}
			>
				{tagsQuery.isPending ? (
					<p className="px-5 py-4 text-sm">{m.settings_tags_loading()}</p>
				) : tagsQuery.isError ? (
					<div className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
						<p>{m.settings_tags_load_failed()}</p>
						<Button
							type="button"
							size="sm"
							variant="dark"
							onClick={() => tagsQuery.refetch()}
						>
							{m.security_retry()}
						</Button>
					</div>
				) : tagsQuery.data.length === 0 ? (
					<div className="px-5 py-10 text-center">
						<TagIcon
							size={28}
							weight="duotone"
							className="mx-auto text-ink/35 dark:text-surface/35"
						/>
						<p className="mt-2 text-sm font-medium">
							{m.settings_tags_empty()}
						</p>
						<p className="mt-1 text-sm text-ink/55 dark:text-surface/55">
							{m.settings_tags_empty_description()}
						</p>
					</div>
				) : (
					<ul>
						{tagsQuery.data.map((tag) => (
							<TagRow
								key={tag.name}
								tag={tag}
								allTags={tagsQuery.data}
								isEditing={editingTag === tag.name}
								isRenaming={renamingTag === tag.name}
								onEdit={() => setEditingTag(tag.name)}
								onCancelEdit={() => setEditingTag(undefined)}
								onRename={(newName) =>
									renameTag(tag.name, newName, () => setEditingTag(undefined))
								}
								onDelete={() => setTagToDelete(tag)}
							/>
						))}
					</ul>
				)}
			</SettingsSection>
			<AlertDialog.Root
				open={tagToDelete !== undefined}
				onOpenChange={(open) => {
					if (!open && deletingTag === undefined) setTagToDelete(undefined);
				}}
			>
				<AlertDialog.Portal>
					<AlertDialog.Backdrop className="fixed inset-0 z-50 bg-surface/20 backdrop-blur-sm" />
					<AlertDialog.Popup className={alertPopup()}>
						<AlertDialog.Title className="text-lg font-semibold">
							{m.settings_tags_delete_title()}
						</AlertDialog.Title>
						<AlertDialog.Description className="mt-2 text-sm">
							{tagToDelete &&
								m.settings_tags_delete_description({
									name: tagToDelete.name,
									count: tagToDelete.count,
								})}
						</AlertDialog.Description>
						<div className="mt-6 flex justify-end gap-2">
							<AlertDialog.Close
								disabled={deletingTag !== undefined}
								render={<Button type="button" size="sm" variant="dark" />}
							>
								{m.user_menu_cancel()}
							</AlertDialog.Close>
							<Button
								type="button"
								size="sm"
								variant="danger"
								disabled={!tagToDelete || deletingTag !== undefined}
								onClick={() => {
									if (tagToDelete) {
										deleteTag(tagToDelete.name, () =>
											setTagToDelete(undefined),
										);
									}
								}}
							>
								{deletingTag
									? m.settings_tags_deleting()
									: m.settings_tags_delete()}
							</Button>
						</div>
					</AlertDialog.Popup>
				</AlertDialog.Portal>
			</AlertDialog.Root>
		</>
	);
}
