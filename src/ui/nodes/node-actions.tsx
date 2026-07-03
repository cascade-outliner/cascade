import { ArrowsClockwiseIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import {
	type NodeTypeName,
	nodeTypeDefs,
	nodeTypeNames,
} from "@/core/nodes/node-types";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/ui/context-menu";

interface NodeActionsProps {
	nodeType: NodeTypeName;
	onConvert: (type: NodeTypeName) => void;
	onDelete: () => void;
	viewTransitionName?: string;
	children: ReactNode;
}

export function NodeActions({
	nodeType,
	onConvert,
	onDelete,
	viewTransitionName,
	children,
}: NodeActionsProps) {
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
