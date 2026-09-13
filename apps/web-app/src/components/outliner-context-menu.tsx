import type { OutlineNode } from "@cascade/data";
import { Menu } from "@cascade/ui/context-menu";
import {
	ArrowLineLeftIcon,
	ArrowLineRightIcon,
	ArrowSquareOutIcon,
	ArrowsLeftRightIcon,
	CalendarBlankIcon,
	CircleIcon,
	CopyIcon,
	LinkSimpleIcon,
	ListChecksIcon,
	MagnifyingGlassPlusIcon,
	NoteIcon,
	SparkleIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useOutlineStore } from "#/lib/outline-store.tsx";

export interface OutlinerContextMenuProps {
	node: OutlineNode;
	children: ReactNode;
	onOpenChange?: (open: boolean) => void;
	onZoomIn?: (id: string) => void;
}

export function OutlinerContextMenu({
	node,
	children,
	onOpenChange,
	onZoomIn,
}: OutlinerContextMenuProps) {
	const store = useOutlineStore();

	return (
		<Menu.Root onOpenChange={onOpenChange}>
			<Menu.Trigger>{children}</Menu.Trigger>
			<Menu.Popup>
				<Menu.Submenu
					icon={<ArrowsLeftRightIcon size={15} />}
					label="Convert into"
				>
					<Menu.RadioGroup
						value={node.task ? "task" : "text"}
						onValueChange={(value) => {
							if (value === "task") store.setTask(node.id, { done: false });
							if (value === "text") store.setTask(node.id, null);
						}}
					>
						<Menu.RadioItem
							value="text"
							icon={<CircleIcon size={6} weight="fill" />}
						>
							Text
						</Menu.RadioItem>
						<Menu.RadioItem value="task" icon={<CircleIcon size={14} />}>
							Task
						</Menu.RadioItem>
						<Menu.RadioItem
							value="date"
							icon={<CalendarBlankIcon size={15} />}
							disabled
						>
							Date
						</Menu.RadioItem>
						<Menu.RadioItem
							value="checklist"
							icon={<ListChecksIcon size={15} />}
							disabled
						>
							Checklist
						</Menu.RadioItem>
						<Menu.RadioItem value="note" icon={<NoteIcon size={15} />} disabled>
							Note
						</Menu.RadioItem>
					</Menu.RadioGroup>
				</Menu.Submenu>
				<Menu.Item
					icon={<MagnifyingGlassPlusIcon size={15} />}
					shortcut="⌥↓"
					onClick={() => onZoomIn?.(node.id)}
				>
					Zoom in
				</Menu.Item>
				<Menu.Item icon={<ArrowSquareOutIcon size={15} />} disabled>
					Open in new pane
				</Menu.Item>
				<Menu.Separator />
				<Menu.Submenu icon={<CopyIcon size={15} />} label="Duplicate">
					<Menu.Item shortcut="⌘D" onClick={() => store.duplicate(node.id)}>
						Duplicate selected
					</Menu.Item>
					<Menu.Item
						disabled={node.children.length === 0}
						onClick={() => store.duplicateWithChildren(node.id)}
					>
						Duplicate with children
					</Menu.Item>
				</Menu.Submenu>
				<Menu.Item
					icon={<ArrowLineRightIcon size={15} />}
					shortcut="⇥"
					disabled={!store.canIndent(node.id)}
					onClick={() => store.indent(node.id)}
				>
					Indent
				</Menu.Item>
				<Menu.Item
					icon={<ArrowLineLeftIcon size={15} />}
					shortcut="⇧⇥"
					disabled={!store.canOutdent(node.id)}
					onClick={() => store.outdent(node.id)}
				>
					Outdent
				</Menu.Item>
				<Menu.Separator />
				<Menu.Item icon={<SparkleIcon size={15} />} shortcut="⌘⏎" disabled>
					Break into steps
				</Menu.Item>
				<Menu.Item
					icon={<LinkSimpleIcon size={15} />}
					onClick={() => {
						const url = new URL(`/node/${node.id}`, window.location.origin);
						navigator.clipboard.writeText(url.toString());
					}}
				>
					Copy link
				</Menu.Item>
				<Menu.Separator />
				<Menu.Item
					icon={<TrashIcon size={15} />}
					shortcut="⌘⌫"
					danger
					onClick={() => store.remove(node.id)}
				>
					Delete
				</Menu.Item>
			</Menu.Popup>
		</Menu.Root>
	);
}
