import { NodeDueDatePill } from "@cascade/outliner/features/due-date/node-due-date-pill";
import { NodeTagsControl } from "@cascade/outliner/features/tags/node-tags-pills";
import { NodeCheckbox } from "@cascade/outliner/features/task/node-checkbox";
import { LexicalReadView } from "@cascade/outliner/lexical/read/lexical-read-view";
import { toLexicalContent } from "@cascade/outliner/lexical-content";
import type { TagSummary } from "@cascade/outliner/node-tags";
import { Breadcrumbs } from "#/features/nodes/ui/breadcrumbs";
import type { NodeDetailData } from "./node-detail.types";

export function NodeDetailHeader({
	node,
	dueDate,
	completed,
	existingTags,
	onToggleTask,
	onDueDateChange,
	onTagsChange,
	onDeleteTag,
}: {
	node: NodeDetailData;
	dueDate: Date | null;
	completed: boolean;
	existingTags: TagSummary[];
	onToggleTask: (completed: boolean) => void;
	onDueDateChange: (dueDate: Date | null) => void;
	onTagsChange: (tags: string[]) => void;
	onDeleteTag: (tag: string) => void;
}) {
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
				</div>

				<div className="flex items-start gap-1">
					{dueDate && (
						<NodeDueDatePill
							dueDate={dueDate}
							completed={completed}
							onChange={onDueDateChange}
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
		</>
	);
}
