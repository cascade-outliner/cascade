import { MAX_TAG_LENGTH } from "@cascade/outliner/node-tags";
import { Button } from "@cascade/ui/button";
import { PlusIcon } from "@phosphor-icons/react/ssr";
import { type FormEvent, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { tagNameInput } from "./tag-settings.styles";

interface CreateTagFormProps {
	existingNames: string[];
	isCreating: boolean;
	onCreate: (name: string, onSuccess: () => void) => void;
}

export function CreateTagForm({
	existingNames,
	isCreating,
	onCreate,
}: CreateTagFormProps) {
	const [newTagName, setNewTagName] = useState("");
	const trimmedNewTagName = newTagName.trim();
	const duplicateNewTag = existingNames.some(
		(name) => name.toLowerCase() === trimmedNewTagName.toLowerCase(),
	);

	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (!trimmedNewTagName || duplicateNewTag) return;
		onCreate(trimmedNewTagName, () => setNewTagName(""));
	};

	return (
		<form
			onSubmit={submit}
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
				disabled={!trimmedNewTagName || duplicateNewTag || isCreating}
			>
				{isCreating ? m.settings_tags_creating() : m.settings_tags_create()}
			</Button>
		</form>
	);
}
