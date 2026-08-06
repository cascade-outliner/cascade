import type { CalendarTimeString } from "@cascade/outliner/calendar-time";
import { NodeDueDatePill } from "@cascade/outliner/features/due-date/node-due-date-pill";
import { EmojiPicker } from "@cascade/outliner/features/icon/emoji-picker";
import { NodePriorityControl } from "@cascade/outliner/features/priority/node-priority-control";
import { NodeStatusControl } from "@cascade/outliner/features/status/node-status-control";
import { NodeTagsControl } from "@cascade/outliner/features/tags/node-tags-pills";
import { NodeCheckbox } from "@cascade/outliner/features/task/node-checkbox";
import { useOutlinerLabels } from "@cascade/outliner/labels-context";
import { LexicalReadView } from "@cascade/outliner/lexical/read/lexical-read-view";
import { toLexicalContent } from "@cascade/outliner/lexical-content";
import type { PriorityName } from "@cascade/outliner/node-priority";
import type { StatusSummary } from "@cascade/outliner/node-statuses";
import type { TagSummary } from "@cascade/outliner/node-tags";
import type { RecurrenceInput } from "@cascade/outliner/recurrence";
import { Popover, PopoverContent, PopoverTrigger } from "@cascade/ui/popover";
import { SmileyIcon } from "@phosphor-icons/react/ssr";
import { Breadcrumbs } from "#/features/nodes/ui/breadcrumbs";
import type { NodeDetailData } from "./node-detail.types";

function NodeIconTrigger({
	icon,
	onChange,
}: {
	icon: string | null;
	onChange: (icon: string | null) => void;
}) {
	const labels = useOutlinerLabels();
	return (
		<Popover>
			<PopoverTrigger
				aria-label={icon ? labels.changeIcon : labels.setIcon}
				className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-ink/20 text-xl outline-none hover:bg-ink/5 dark:border-surface/25 dark:hover:bg-surface/10"
			>
				{icon ?? <SmileyIcon size={16} weight="bold" className="text-muted" />}
			</PopoverTrigger>
			<PopoverContent>
				<EmojiPicker
					value={icon}
					onSelect={onChange}
					onClear={() => onChange(null)}
				/>
			</PopoverContent>
		</Popover>
	);
}

export function NodeDetailHeader({
	node,
	dueDate,
	dueTime,
	completed,
	existingTags,
	existingStatuses,
	onToggleTask,
	onDueDateChange,
	onRecurrenceChange,
	onTagsChange,
	onDeleteTag,
	onIconChange,
	onPriorityChange,
	onStatusChange,
	onCreateStatus,
	onDeleteStatus,
}: {
	node: NodeDetailData;
	dueDate: Date | null;
	dueTime: CalendarTimeString | null;
	completed: boolean;
	existingTags: TagSummary[];
	existingStatuses: StatusSummary[];
	onToggleTask: (completed: boolean) => void;
	onDueDateChange: (
		dueDate: Date | null,
		dueTime: CalendarTimeString | null,
	) => void;
	onRecurrenceChange: (recurrence: RecurrenceInput | null) => void;
	onTagsChange: (tags: string[]) => void;
	onDeleteTag: (tag: string) => void;
	onIconChange: (icon: string | null) => void;
	onPriorityChange: (priority: PriorityName | null) => void;
	onStatusChange: (statusId: string | null) => void;
	onCreateStatus: (name: string) => Promise<StatusSummary | null>;
	onDeleteStatus: (id: string) => void | Promise<void>;
}) {
	return (
		<>
			<Breadcrumbs nodeId={node.id} />
			<header
				style={{ viewTransitionName: `node-${node.id}` }}
				className="group/node mb-8 flex flex-col gap-3 text-2xl"
			>
				<div className="flex items-center gap-3">
					<NodeIconTrigger icon={node.icon} onChange={onIconChange} />
					{node.type === "task" && (
						<NodeCheckbox metadata={node.metadata} onToggle={onToggleTask} />
					)}
					<LexicalReadView content={toLexicalContent(node.content)} />
				</div>

				<div className="flex items-start gap-1">
					{dueDate && (
						<NodeDueDatePill
							dueDate={dueDate}
							dueTime={dueTime}
							completed={completed}
							recurrence={node.recurrence}
							recurrenceEnabled={node.type === "task"}
							onChange={onDueDateChange}
							onRecurrenceChange={onRecurrenceChange}
						/>
					)}
					<NodePriorityControl
						priority={node.priority}
						onChange={onPriorityChange}
					/>
					<NodeStatusControl
						status={node.status}
						existingStatuses={existingStatuses}
						onSelect={onStatusChange}
						onCreateStatus={onCreateStatus}
						onDeleteStatus={onDeleteStatus}
					/>
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
