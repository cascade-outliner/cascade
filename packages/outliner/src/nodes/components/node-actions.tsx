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
	CopyIcon,
	KanbanIcon,
	ParagraphIcon,
	TextHFiveIcon,
	TextHFourIcon,
	TextHOneIcon,
	TextHSixIcon,
	TextHThreeIcon,
	TextHTwoIcon,
	TrashIcon,
	TreeStructureIcon,
} from "@phosphor-icons/react/ssr";
import { Fragment, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import type { BlockType } from "../../editor/lexical/content/lexical-content";
import { useOutlinerLabels } from "../../i18n/outliner-labels-context";
import type { NodeTypeName } from "../model/node-types";

/** Every option in the merged "Convert into" menu: the row-level `task` type,
 * plus every Lexical block type ("text" is represented by `blockType`
 * "paragraph", so it isn't listed separately). */
export type ConvertOption = "task" | BlockType;

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

export async function runNodeConversion(
	option: ConvertOption,
	onConvert: (type: NodeTypeName) => undefined | Promise<boolean>,
	onTurnInto: (blockType: BlockType) => undefined | Promise<boolean>,
	onSuccess: () => void,
): Promise<void> {
	if (option === "task") {
		if ((await onConvert("task")) !== false) onSuccess();
		return;
	}
	if ((await onConvert("text")) === false) return;
	if ((await onTurnInto(option)) !== false) onSuccess();
}

interface NodeActionsProps {
	nodeType: NodeTypeName;
	blockType: BlockType;
	/** Whether this node is currently a board (see #455) — an axis
	 * orthogonal to `nodeType`/`blockType`: a board can hold a paragraph,
	 * heading, or task just like a tree node can. */
	isBoard: boolean;
	onConvert: (type: NodeTypeName) => undefined | Promise<boolean>;
	onTurnInto: (blockType: BlockType) => undefined | Promise<boolean>;
	onSetBoardView: (isBoard: boolean) => void;
	onConversionSuccess: () => void;
	onDuplicate: () => void;
	onDelete: () => void;
	/** Feature-contributed menu entries (due date, tags, …), rendered in
	 * order before the core "Convert into"/"Delete" entries. */
	menuItems: { id: string; node: ReactNode }[];
	viewTransitionName?: string;
	/** Overrides the trigger's default row-flex layout — e.g. `"contents"`
	 * for a board card, whose own layout is a column, not a row (see #455
	 * follow-up). */
	className?: string;
	children: ReactNode;
}

export function NodeActions({
	nodeType,
	blockType,
	isBoard,
	onConvert,
	onTurnInto,
	onSetBoardView,
	onConversionSuccess,
	onDuplicate,
	onDelete,
	menuItems,
	viewTransitionName,
	className,
	children,
}: NodeActionsProps) {
	const labels = useOutlinerLabels();
	const currentOption: ConvertOption = nodeType === "task" ? "task" : blockType;

	function optionLabel(option: ConvertOption): string {
		if (option === "task") return labels.nodeTypeLabels.task;
		if (option === "paragraph") return labels.nodeTypeLabels.text;
		return labels.headingLabels[option];
	}

	async function selectOption(option: ConvertOption) {
		await runNodeConversion(option, onConvert, onTurnInto, onConversionSuccess);
	}

	function selectBoardView(nextIsBoard: boolean) {
		if (nextIsBoard === isBoard) return;
		onSetBoardView(nextIsBoard);
		onConversionSuccess();
	}

	return (
		<ContextMenu>
			<ContextMenuTrigger
				style={{ viewTransitionName }}
				className={twMerge("flex items-center gap-2 min-w-0 flex-1", className)}
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
						{/* A separate axis from the content-type options below
						(#455 follow-up): a tree or a board can each still hold a
						paragraph, heading, or task, so this stays its own group,
						first since it's the broader choice. */}
						<ContextMenuItem
							icon={<TreeStructureIcon size={14} weight="bold" />}
							disabled={!isBoard}
							onClick={() => selectBoardView(false)}
						>
							{labels.convertOptionTree}
						</ContextMenuItem>
						<ContextMenuItem
							icon={<KanbanIcon size={14} weight="bold" />}
							disabled={isBoard}
							onClick={() => selectBoardView(true)}
						>
							{labels.convertOptionBoard}
						</ContextMenuItem>
						<ContextMenuSeparator />
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
				<ContextMenuItem
					icon={<CopyIcon size={14} weight="bold" />}
					onClick={onDuplicate}
				>
					{labels.duplicate}
				</ContextMenuItem>
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
