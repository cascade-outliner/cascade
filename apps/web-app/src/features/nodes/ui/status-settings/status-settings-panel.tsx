import type { StatusWithUsage } from "@cascade/outliner/node-statuses";
import { Button } from "@cascade/ui/button";
import { CircleDashedIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { m } from "#/paraglide/messages.js";
import { useStatusManagement } from "@/features/nodes/client/statuses/use-existing-statuses";
import {
	SettingsPageDescription,
	SettingsSection,
} from "@/features/settings/ui/settings-panel";
import { CreateStatusForm } from "./create-status-form";
import { DeleteStatusDialog } from "./delete-status-dialog";
import { StatusRow } from "./status-row";

export function StatusSettingsPanel() {
	const {
		statusesQuery,
		createStatus,
		isCreatingStatus,
		updateStatus,
		updatingStatus,
		deleteStatus,
		deletingStatus,
	} = useStatusManagement();
	const [editingStatus, setEditingStatus] = useState<string>();
	const [statusToDelete, setStatusToDelete] = useState<StatusWithUsage>();

	return (
		<>
			<SettingsPageDescription>
				{m.settings_statuses_description()}
			</SettingsPageDescription>
			<SettingsSection
				title={m.settings_statuses_create_section()}
				description={m.settings_statuses_create_description()}
			>
				<CreateStatusForm
					existingNames={statusesQuery.data?.map((status) => status.name) ?? []}
					isCreating={isCreatingStatus}
					onCreate={createStatus}
				/>
			</SettingsSection>
			<SettingsSection
				title={m.settings_statuses_section()}
				description={m.settings_statuses_section_description()}
			>
				{statusesQuery.isPending ? (
					<p className="px-5 py-4 text-sm">{m.settings_statuses_loading()}</p>
				) : statusesQuery.isError ? (
					<div className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
						<p>{m.settings_statuses_load_failed()}</p>
						<Button
							type="button"
							size="sm"
							variant="dark"
							onClick={() => statusesQuery.refetch()}
						>
							{m.security_retry()}
						</Button>
					</div>
				) : statusesQuery.data.length === 0 ? (
					<div className="px-5 py-10 text-center">
						<CircleDashedIcon
							size={28}
							weight="duotone"
							className="mx-auto text-ink/35 dark:text-surface/35"
						/>
						<p className="mt-2 text-sm font-medium">
							{m.settings_statuses_empty()}
						</p>
						<p className="mt-1 text-sm text-ink/55 dark:text-surface/55">
							{m.settings_statuses_empty_description()}
						</p>
					</div>
				) : (
					<ul>
						{statusesQuery.data.map((status) => (
							<StatusRow
								key={status.id}
								status={status}
								allStatuses={statusesQuery.data}
								isEditing={editingStatus === status.id}
								isSaving={updatingStatus === status.id}
								onEdit={() => setEditingStatus(status.id)}
								onCancelEdit={() => setEditingStatus(undefined)}
								onSave={(changes) =>
									updateStatus(status.id, changes, () =>
										setEditingStatus(undefined),
									)
								}
								onDelete={() => setStatusToDelete(status)}
							/>
						))}
					</ul>
				)}
			</SettingsSection>
			<DeleteStatusDialog
				status={statusToDelete}
				isDeleting={deletingStatus !== undefined}
				onOpenChange={(open) => {
					if (!open && deletingStatus === undefined)
						setStatusToDelete(undefined);
				}}
				onConfirm={() => {
					if (statusToDelete) {
						deleteStatus(statusToDelete.id, () => setStatusToDelete(undefined));
					}
				}}
			/>
		</>
	);
}
