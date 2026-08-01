import type { TagSummary } from "@cascade/outliner/node-tags";
import { Button } from "@cascade/ui/button";
import { TagIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { m } from "#/paraglide/messages.js";
import { useTagManagement } from "@/features/nodes/client/tags/use-existing-tags";
import {
	SettingsPageDescription,
	SettingsSection,
} from "@/features/settings/ui/settings-panel";
import { CreateTagForm } from "./create-tag-form";
import { DeleteTagDialog } from "./delete-tag-dialog";
import { TagRow } from "./tag-row";

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
	const [editingTag, setEditingTag] = useState<string>();
	const [tagToDelete, setTagToDelete] = useState<TagSummary>();

	return (
		<>
			<SettingsPageDescription>
				{m.settings_tags_description()}
			</SettingsPageDescription>
			<SettingsSection
				title={m.settings_tags_create_section()}
				description={m.settings_tags_create_description()}
			>
				<CreateTagForm
					existingNames={tagsQuery.data?.map((tag) => tag.name) ?? []}
					isCreating={isCreatingTag}
					onCreate={createTag}
				/>
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
			<DeleteTagDialog
				tag={tagToDelete}
				isDeleting={deletingTag !== undefined}
				onOpenChange={(open) => {
					if (!open && deletingTag === undefined) setTagToDelete(undefined);
				}}
				onConfirm={() => {
					if (tagToDelete) {
						deleteTag(tagToDelete.name, () => setTagToDelete(undefined));
					}
				}}
			/>
		</>
	);
}
