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
	CheckIcon,
	TagIcon,
	TrashIcon,
} from "@phosphor-icons/react/ssr";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
	type NodeTypeName,
	nodeTypeDefs,
	nodeTypeNames,
} from "@/core/nodes/node-types";
import type { TagSummary } from "@/core/tags/tag.types";
import { orpc } from "@/orpc/client";

interface NodeActionsProps {
	nodeType: NodeTypeName;
	tags: TagSummary[];
	onConvert: (type: NodeTypeName) => void;
	onDelete: () => void;
	onAddTag: (tag: TagSummary) => void;
	onRemoveTag: (tagId: string) => void;
	viewTransitionName?: string;
	children: ReactNode;
}

export function NodeActions({
	nodeType,
	tags,
	onConvert,
	onDelete,
	onAddTag,
	onRemoveTag,
	viewTransitionName,
	children,
}: NodeActionsProps) {
	const { data: allTags } = useQuery(
		orpc.tags.list.queryOptions({ input: {} }),
	);
	const attachedIds = new Set(tags.map((t) => t.id));

	return (
		<ContextMenu>
			<ContextMenuTrigger
				className="flex items-center gap-2 min-w-0 flex-1"
				style={{ viewTransitionName }}
				onTouchStart={(e) => e.stopPropagation()}
				onContextMenu={(e) => e.stopPropagation()}
			>
				{children}
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuSub>
					<ContextMenuSubTrigger
						icon={<ArrowsClockwiseIcon size={14} weight="bold" />}
					>
						Convert into
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						{nodeTypeNames
							.filter((type) => type !== nodeType)
							.map((type) => (
								<ContextMenuItem key={type} onClick={() => onConvert(type)}>
									{nodeTypeDefs[type].label}
								</ContextMenuItem>
							))}
					</ContextMenuSubContent>
				</ContextMenuSub>
				<ContextMenuSub>
					<ContextMenuSubTrigger icon={<TagIcon size={14} weight="bold" />}>
						Tags
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						{!allTags || allTags.length === 0 ? (
							<ContextMenuItem disabled>
								No tags yet — create one in Settings
							</ContextMenuItem>
						) : (
							allTags.map((tag) => {
								const attached = attachedIds.has(tag.id);
								return (
									<ContextMenuItem
										key={tag.id}
										icon={
											<span
												aria-hidden
												className="block size-2.5 rounded-full"
												style={{ backgroundColor: tag.color }}
											/>
										}
										onClick={() =>
											attached ? onRemoveTag(tag.id) : onAddTag(tag)
										}
									>
										<span className="flex-1">{tag.name}</span>
										{attached && <CheckIcon size={14} weight="bold" />}
									</ContextMenuItem>
								);
							})
						)}
					</ContextMenuSubContent>
				</ContextMenuSub>
				<ContextMenuSeparator />
				<ContextMenuItem
					variant="destructive"
					icon={<TrashIcon size={14} weight="bold" />}
					onClick={onDelete}
				>
					Delete
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
