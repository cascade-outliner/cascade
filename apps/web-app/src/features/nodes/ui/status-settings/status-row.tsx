import {
	MAX_STATUS_LENGTH,
	type StatusColor,
	type StatusWithUsage,
	toStatusColor,
} from "@cascade/outliner/node-statuses";
import { Button } from "@cascade/ui/button";
import { PencilSimpleIcon, TrashIcon, XIcon } from "@phosphor-icons/react/ssr";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { iconButton } from "@/features/user-menu/ui/user-menu.styles";
import { StatusColorPicker } from "./status-color-picker";
import { colorSwatch, statusNameInput } from "./status-settings.styles";

interface StatusRowProps {
	status: StatusWithUsage;
	allStatuses: StatusWithUsage[];
	isEditing: boolean;
	isSaving: boolean;
	onEdit: () => void;
	onCancelEdit: () => void;
	onSave: (changes: { name?: string; color?: StatusColor }) => void;
	onDelete: () => void;
}

export function StatusRow({
	status,
	allStatuses,
	isEditing,
	isSaving,
	onEdit,
	onCancelEdit,
	onSave,
	onDelete,
}: StatusRowProps) {
	const [name, setName] = useState(status.name);
	const [color, setColor] = useState<StatusColor>(toStatusColor(status.color));
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const trimmedName = name.trim();
	const duplicate = allStatuses.some(
		(candidate) =>
			candidate.id !== status.id &&
			candidate.name.toLowerCase() === trimmedName.toLowerCase(),
	);
	const invalid = trimmedName.length === 0 || duplicate;
	const unchanged =
		trimmedName === status.name && color === toStatusColor(status.color);

	useEffect(() => {
		if (isEditing) {
			inputRef.current?.focus();
			inputRef.current?.select();
		}
	}, [isEditing]);

	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (invalid || unchanged) return;
		onSave({
			name: trimmedName === status.name ? undefined : trimmedName,
			color: color === toStatusColor(status.color) ? undefined : color,
		});
	};

	if (isEditing) {
		return (
			<li className="border-b border-ink/10 px-5 py-4 last:border-b-0 dark:border-surface/15">
				<form onSubmit={submit}>
					<label htmlFor={inputId} className="text-sm font-medium">
						{m.settings_statuses_name_label()}
					</label>
					<div className="mt-1.5 flex items-start gap-2">
						<div className="min-w-0 flex-1">
							<input
								ref={inputRef}
								id={inputId}
								value={name}
								maxLength={MAX_STATUS_LENGTH}
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
							disabled={invalid || unchanged || isSaving}
						>
							{isSaving
								? m.settings_statuses_saving()
								: m.settings_statuses_save()}
						</Button>
						<button
							type="button"
							aria-label={m.user_menu_cancel()}
							className={iconButton({ className: "mt-0.5" })}
							disabled={isSaving}
							onClick={onCancelEdit}
						>
							<XIcon size={18} weight="bold" />
						</button>
					</div>
					<div className="mt-3">
						<StatusColorPicker value={color} onChange={setColor} />
					</div>
				</form>
			</li>
		);
	}

	return (
		<li className="flex min-h-16 items-center gap-3 border-b border-ink/10 px-5 py-3 last:border-b-0 dark:border-surface/15">
			<span
				aria-hidden="true"
				className={colorSwatch({ hue: toStatusColor(status.color) })}
			/>
			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-medium">{status.name}</div>
				<div className="text-sm text-ink/55 dark:text-surface/55">
					{m.settings_statuses_usage_count({ count: status.count })}
				</div>
			</div>
			<button
				type="button"
				aria-label={m.settings_statuses_edit_label({ name: status.name })}
				className={iconButton()}
				onClick={onEdit}
			>
				<PencilSimpleIcon size={17} weight="bold" />
			</button>
			<button
				type="button"
				aria-label={m.settings_statuses_delete_label({ name: status.name })}
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
