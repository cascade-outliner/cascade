import { MAX_TAG_LENGTH, type TagSummary } from "@cascade/outliner/node-tags";
import { Button } from "@cascade/ui/button";
import {
	PencilSimpleIcon,
	TagIcon,
	TrashIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { iconButton } from "@/features/user-menu/ui/user-menu.styles";
import { tagNameInput } from "./tag-settings.styles";

interface TagRowProps {
	tag: TagSummary;
	isEditing: boolean;
	isRenaming: boolean;
	onEdit: () => void;
	onCancelEdit: () => void;
	onRename: (newName: string) => void;
	onDelete: () => void;
	allTags: TagSummary[];
}

export function TagRow({
	tag,
	isEditing,
	isRenaming,
	onEdit,
	onCancelEdit,
	onRename,
	onDelete,
	allTags,
}: TagRowProps) {
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
