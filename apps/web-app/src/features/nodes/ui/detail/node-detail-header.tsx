import { NodeDueDatePill } from "@cascade/outliner/features/due-date/node-due-date-pill";
import { NodeTagsControl } from "@cascade/outliner/features/tags/node-tags-pills";
import { NodeCheckbox } from "@cascade/outliner/features/task/node-checkbox";
import { LexicalReadView } from "@cascade/outliner/lexical/read/lexical-read-view";
import { toLexicalContent } from "@cascade/outliner/lexical-content";
import type { TagSummary } from "@cascade/outliner/node-tags";
import type { RecurrenceInput } from "@cascade/outliner/recurrence";
import { ShareIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { Breadcrumbs } from "#/features/nodes/ui/breadcrumbs";
import { ShareDialog } from "#/features/sharing/ui/share-dialog";
import { m } from "#/paraglide/messages.js";
import type { NodeDetailData } from "./node-detail.types";

export function NodeDetailHeader({
	node,
	dueDate,
	completed,
	existingTags,
	onToggleTask,
	onDueDateChange,
	onRecurrenceChange,
	onTagsChange,
	onDeleteTag,
}: {
	node: NodeDetailData;
	dueDate: Date | null;
	completed: boolean;
	existingTags: TagSummary[];
	onToggleTask: (completed: boolean) => void;
	onDueDateChange: (dueDate: Date | null) => void;
	onRecurrenceChange: (recurrence: RecurrenceInput | null) => void;
	onTagsChange: (tags: string[]) => void;
	onDeleteTag: (tag: string) => void;
}) {
	const [shareDialogOpen, setShareDialogOpen] = useState(false);

	return (
		<>
			<Breadcrumbs nodeId={node.id} />
			<header
				style={{ viewTransitionName: `node-${node.id}` }}
				className="group/node mb-8 flex flex-col gap-3 text-2xl"
			>
				<div className="flex items-center gap-3">
					{node.type === "task" && (
						<NodeCheckbox metadata={node.metadata} onToggle={onToggleTask} />
					)}
					<LexicalReadView content={toLexicalContent(node.content)} />
					<button
						type="button"
						aria-label={m.sharing_dialog_title()}
						className="ml-auto cursor-pointer self-start rounded-md p-1.5 text-ink/50 text-base outline-none hover:bg-ink/5 hover:text-ink dark:text-surface/50 dark:hover:bg-surface/10 dark:hover:text-surface"
						onClick={() => setShareDialogOpen(true)}
					>
						<ShareIcon size={18} />
					</button>
				</div>

				<div className="flex items-start gap-1">
					{dueDate && (
						<NodeDueDatePill
							dueDate={dueDate}
							completed={completed}
							recurrence={node.recurrence}
							recurrenceEnabled={node.type === "task"}
							onChange={onDueDateChange}
							onRecurrenceChange={onRecurrenceChange}
						/>
					)}
					<NodeTagsControl
						tags={node.tags}
						existingTags={existingTags}
						onChange={onTagsChange}
						onDeleteTag={onDeleteTag}
					/>
				</div>
			</header>
			<ShareDialog
				nodeId={node.id}
				open={shareDialogOpen}
				onOpenChange={setShareDialogOpen}
			/>
		</>
	);
}
