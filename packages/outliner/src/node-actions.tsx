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
	CheckSquareIcon,
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
import type { BlockType } from "./lexical/lexical-content";
import type { NodeTypeName } from "./node-types";

/** Every option in the merged "Convert into" menu: the row-level `task` type,
 * plus every Lexical block type ("text" is represented by `blockType`
 * "paragraph", so it isn't listed separately). */
type ConvertOption = "task" | BlockType;

/** Block-type options, grouped together and separated from `task` (a
 * different axis: the row type, not the content format) by a divider. */
const BLOCK_OPTIONS: BlockType[] = [
	"paragraph",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
];

const CONVERT_ICONS: Record<ConvertOption, ReactNode> = {
	paragraph: <ParagraphIcon size={14} weight="bold" />,
	task: <CheckSquareIcon size={14} weight="bold" />,
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
	 * order before the core "Convert into"/"Delete" entries. */
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
	const currentOption: ConvertOption = nodeType === "task" ? "task" : blockType;

	function optionLabel(option: ConvertOption): string {
		if (option === "task") return labels.nodeTypeLabels.task;
		if (option === "paragraph") return labels.nodeTypeLabels.text;
		return labels.headingLabels[option];
	}

	function selectOption(option: ConvertOption) {
		if (option === "task") {
			onConvert("task");
			return;
		}
		onConvert("text");
		onTurnInto(option);
	}

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
					<ContextMenuSubTrigger icon={CONVERT_ICONS[currentOption]}>
						{labels.convertInto}
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						{BLOCK_OPTIONS.map((option) => (
							<ContextMenuItem
								key={option}
								icon={CONVERT_ICONS[option]}
								disabled={option === currentOption}
								onClick={() => selectOption(option)}
							>
								{optionLabel(option)}
							</ContextMenuItem>
						))}
						<ContextMenuSeparator />
						<ContextMenuItem
							icon={CONVERT_ICONS.task}
							disabled={currentOption === "task"}
							onClick={() => selectOption("task")}
						>
							{optionLabel("task")}
						</ContextMenuItem>
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
