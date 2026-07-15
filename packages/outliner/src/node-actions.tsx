import { Calendar } from "@cascade/ui/calendar";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@cascade/ui/context-menu";
import {
	ArrowsClockwiseIcon,
	CalendarIcon,
	TagIcon,
	TrashIcon,
} from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { useOutlinerLabels } from "./labels-context";
import { NodeTagsEditor } from "./node-tags-editor";
import { type NodeTypeName, nodeTypeNames } from "./node-types";

interface NodeActionsProps {
	nodeType: NodeTypeName;
	dueDate: Date | null;
	tags: string[];
	onConvert: (type: NodeTypeName) => void;
	onSetDueDate: (date: Date | null) => void;
	onSetTags: (tags: string[]) => void;
	onDelete: () => void;
	viewTransitionName?: string;
	children: ReactNode;
}

export function NodeActions({
	nodeType,
	dueDate,
	tags,
	onConvert,
	onSetDueDate,
	onSetTags,
	onDelete,
	viewTransitionName,
	children,
}: NodeActionsProps) {
	const labels = useOutlinerLabels();
	return (
		<ContextMenu>
			<ContextMenuTrigger
				style={{ viewTransitionName }}
				className="flex items-center gap-2 min-w-0 flex-1"
				onTouchStart={(e) => e.stopPropagation()}
				onContextMenu={(e) => e.stopPropagation()}
			>
				{children}
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuSub>
					<ContextMenuSubTrigger
						icon={<CalendarIcon size={14} weight="bold" />}
						openOnHover
						delay={150}
					>
						{dueDate ? labels.changeDueDate : labels.setDueDate}
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						<Calendar
							value={dueDate}
							onSelect={onSetDueDate}
							onClear={() => onSetDueDate(null)}
						/>
					</ContextMenuSubContent>
				</ContextMenuSub>
				<ContextMenuSeparator />
				<ContextMenuSub>
					<ContextMenuSubTrigger
						icon={<TagIcon size={14} weight="bold" />}
						openOnHover
						delay={150}
					>
						{tags.length > 0 ? labels.manageTags : labels.addTag}
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						<NodeTagsEditor tags={tags} onChange={onSetTags} />
					</ContextMenuSubContent>
				</ContextMenuSub>
				<ContextMenuSeparator />
				<ContextMenuSub>
					<ContextMenuSubTrigger
						icon={<ArrowsClockwiseIcon size={14} weight="bold" />}
					>
						{labels.convertInto}
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						{nodeTypeNames
							.filter((type) => type !== nodeType)
							.map((type) => (
								<ContextMenuItem key={type} onClick={() => onConvert(type)}>
									{labels.nodeTypeLabels[type]}
								</ContextMenuItem>
							))}
					</ContextMenuSubContent>
				</ContextMenuSub>
				<ContextMenuSeparator />
				<ContextMenuItem
					variant="destructive"
					icon={<TrashIcon size={14} weight="bold" />}
					onClick={onDelete}
				>
					{labels.delete}
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
