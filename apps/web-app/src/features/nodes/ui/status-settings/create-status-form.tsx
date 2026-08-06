import {
	MAX_STATUS_LENGTH,
	nextStatusColor,
	type StatusColor,
} from "@cascade/outliner/node-statuses";
import { Button } from "@cascade/ui/button";
import { PlusIcon } from "@phosphor-icons/react/ssr";
import { type FormEvent, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { StatusColorPicker } from "./status-color-picker";
import { statusNameInput } from "./status-settings.styles";

interface CreateStatusFormProps {
	existingNames: string[];
	isCreating: boolean;
	onCreate: (name: string, color: StatusColor, onSuccess: () => void) => void;
}

export function CreateStatusForm({
	existingNames,
	isCreating,
	onCreate,
}: CreateStatusFormProps) {
	// Pre-select the color the user would have been given automatically, so
	// picking one is an option rather than a chore.
	const suggestedColor = nextStatusColor(existingNames.length);
	const [name, setName] = useState("");
	const [color, setColor] = useState<StatusColor>(suggestedColor);
	const trimmedName = name.trim();
	const duplicate = existingNames.some(
		(existing) => existing.toLowerCase() === trimmedName.toLowerCase(),
	);

	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (!trimmedName || duplicate) return;
		onCreate(trimmedName, color, () => {
			setName("");
			setColor(nextStatusColor(existingNames.length + 1));
		});
	};

	return (
		<form onSubmit={submit} className="flex flex-col gap-3 px-5 py-4">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start">
				<div className="min-w-0 flex-1">
					<label htmlFor="new-status-name" className="sr-only">
						{m.settings_statuses_name_label()}
					</label>
					<input
						id="new-status-name"
						value={name}
						maxLength={MAX_STATUS_LENGTH}
						placeholder={m.settings_statuses_create_placeholder()}
						onChange={(event) => setName(event.target.value)}
						className={statusNameInput}
					/>
					{duplicate && (
						<p role="alert" className="mt-1 text-xs text-danger">
							{m.settings_statuses_name_exists()}
						</p>
					)}
				</div>
				<Button
					type="submit"
					size="sm"
					variant="dark"
					icon={<PlusIcon size={15} weight="bold" />}
					disabled={!trimmedName || duplicate || isCreating}
				>
					{isCreating
						? m.settings_statuses_creating()
						: m.settings_statuses_create()}
				</Button>
			</div>
			<StatusColorPicker value={color} onChange={setColor} />
		</form>
	);
}
