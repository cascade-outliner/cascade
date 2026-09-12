import type { OutlineNode } from "@cascade/data";
import { Menu } from "@cascade/ui/context-menu";
import {
	ArrowLineLeft,
	ArrowLineRight,
	ArrowSquareOut,
	ArrowsLeftRight,
	CalendarBlank,
	Circle,
	Copy,
	LinkSimple,
	ListChecks,
	MagnifyingGlassPlus,
	Note,
	Sparkle,
	Trash,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useOutlineStore } from "#/lib/outline-store.tsx";

export interface OutlinerContextMenuProps {
	node: OutlineNode;
	children: ReactNode;
}

export function OutlinerContextMenu({
	node,
	children,
}: OutlinerContextMenuProps) {
	const store = useOutlineStore();

	return (
		<Menu.Root>
			<Menu.Trigger>{children}</Menu.Trigger>
			<Menu.Popup>
				<Menu.Submenu icon={<ArrowsLeftRight size={15} />} label="Convert into">
					<Menu.RadioGroup
						value={node.task ? "task" : "text"}
						onValueChange={(value) => {
							if (value === "task") store.setTask(node.id, { done: false });
							if (value === "text") store.setTask(node.id, null);
						}}
					>
						<Menu.RadioItem
							value="text"
							icon={<Circle size={6} weight="fill" />}
						>
							Text
						</Menu.RadioItem>
						<Menu.RadioItem value="task" icon={<Circle size={14} />}>
							Task
						</Menu.RadioItem>
						<Menu.RadioItem
							value="date"
							icon={<CalendarBlank size={15} />}
							disabled
						>
							Date
						</Menu.RadioItem>
						<Menu.RadioItem
							value="checklist"
							icon={<ListChecks size={15} />}
							disabled
						>
							Checklist
						</Menu.RadioItem>
						<Menu.RadioItem value="note" icon={<Note size={15} />} disabled>
							Note
						</Menu.RadioItem>
					</Menu.RadioGroup>
				</Menu.Submenu>
				<Menu.Item
					icon={<MagnifyingGlassPlus size={15} />}
					shortcut="⌥↓"
					disabled
				>
					Zoom in
				</Menu.Item>
				<Menu.Item icon={<ArrowSquareOut size={15} />} disabled>
					Open in new pane
				</Menu.Item>
				<Menu.Separator />
				<Menu.Item
					icon={<Copy size={15} />}
					shortcut="⌘D"
					onClick={() => store.duplicate(node.id)}
				>
					Duplicate
				</Menu.Item>
				<Menu.Item icon={<ArrowLineRight size={15} />} shortcut="⇥" disabled>
					Indent
				</Menu.Item>
				<Menu.Item icon={<ArrowLineLeft size={15} />} shortcut="⇧⇥" disabled>
					Outdent
				</Menu.Item>
				<Menu.Separator />
				<Menu.Item icon={<Sparkle size={15} />} shortcut="⌘⏎" disabled>
					Break into steps
				</Menu.Item>
				<Menu.Item icon={<LinkSimple size={15} />} disabled>
					Copy link
				</Menu.Item>
				<Menu.Separator />
				<Menu.Item
					icon={<Trash size={15} />}
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
