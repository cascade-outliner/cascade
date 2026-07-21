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
	ParagraphIcon,
	TextHFiveIcon,
	TextHFourIcon,
	TextHOneIcon,
	TextHSixIcon,
	TextHThreeIcon,
	TextHTwoIcon,
	TrashIcon,
} from "@phosphor-icons/react/ssr";
import { Fragment, type ReactNode } from "react";
import { useOutlinerLabels } from "./labels-context";
import { type BlockType, blockTypes } from "./lexical/lexical-content";
import { type NodeTypeName, nodeTypeNames } from "./node-types";

const BLOCK_TYPE_ICONS: Record<BlockType, ReactNode> = {
	paragraph: <ParagraphIcon size={14} weight="bold" />,
	h1: <TextHOneIcon size={14} weight="bold" />,
	h2: <TextHTwoIcon size={14} weight="bold" />,
	h3: <TextHThreeIcon size={14} weight="bold" />,
	h4: <TextHFourIcon size={14} weight="bold" />,
	h5: <TextHFiveIcon size={14} weight="bold" />,
	h6: <TextHSixIcon size={14} weight="bold" />,
};

interface NodeActionsProps {
	nodeType: NodeTypeName;
	blockType: BlockType;
	onConvert: (type: NodeTypeName) => void;
	onTurnInto: (blockType: BlockType) => void;
	onDelete: () => void;
	/** Feature-contributed menu entries (due date, tags, …), rendered in
	 * order before the core "Turn into"/"Convert into"/"Delete" entries. */
	menuItems: { id: string; node: ReactNode }[];
	viewTransitionName?: string;
	children: ReactNode;
}

export function NodeActions({
	nodeType,
	blockType,
	onConvert,
	onTurnInto,
	onDelete,
	menuItems,
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
				{menuItems.map(({ id, node }) => (
					<Fragment key={id}>
						{node}
						<ContextMenuSeparator />
					</Fragment>
				))}
				<ContextMenuSub>
					<ContextMenuSubTrigger icon={BLOCK_TYPE_ICONS[blockType]}>
						{labels.turnInto}
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						{blockTypes
							.filter((type) => type !== blockType)
							.map((type) => (
								<ContextMenuItem
									key={type}
									icon={BLOCK_TYPE_ICONS[type]}
									onClick={() => onTurnInto(type)}
								>
									{labels.blockTypeLabels[type]}
								</ContextMenuItem>
							))}
					</ContextMenuSubContent>
				</ContextMenuSub>
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
