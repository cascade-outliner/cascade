import { fromIsoDay, isoDay, type Node, shiftDay } from "@cascade/data";
import { Calendar } from "@cascade/ui/calendar";
import { Menu } from "@cascade/ui/context-menu";
import {
	ArrowLineLeftIcon,
	ArrowLineRightIcon,
	ArrowSquareOutIcon,
	ArrowsLeftRightIcon,
	CalendarBlankIcon,
	CalendarXIcon,
	CircleIcon,
	CopyIcon,
	LinkSimpleIcon,
	ListChecksIcon,
	MagnifyingGlassPlusIcon,
	NoteIcon,
	SparkleIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { observer } from "mobx-react-lite";
import { type ReactNode, useState } from "react";
import { useOutlineStore } from "#/lib/outline-store.tsx";

export interface OutlinerContextMenuProps {
	node: Node;
	childCount: number;
	children: ReactNode;
	onOpenChange?: (open: boolean) => void;
	onZoomIn?: (id: string) => void;
}

export const OutlinerContextMenu = observer(function OutlinerContextMenu({
	node,
	childCount,
	children,
	onOpenChange,
	onZoomIn,
}: OutlinerContextMenuProps) {
	const store = useOutlineStore();
	// Opened on a selected row, the actions apply to the whole selection.
	const batch = store.selection.has(node.id) && store.selection.size > 1;
	const ids = batch ? [...store.selection] : [node.id];
	const count = batch ? ` ${ids.length} nodes` : "";
	// Daily nodes can't be converted or copied.
	const locked = ids.every(store.isLocked);
	// Controlled, so picking a day in the calendar can close the menu.
	const [open, setOpen] = useState(false);
	const setDue = (date: Date | undefined | null) => {
		store.setDueMany(ids, date ? isoDay(date) : null);
		setOpen(false);
	};

	return (
		<Menu.Root
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				onOpenChange?.(next);
			}}
		>
			<Menu.Trigger>{children}</Menu.Trigger>
			<Menu.Popup>
				<Menu.Submenu
					icon={<ArrowsLeftRightIcon size={15} />}
					label="Convert into"
				>
					<Menu.RadioGroup
						value={node.task ? "task" : "text"}
						onValueChange={(value) => {
							if (value === "task") store.setTaskMany(ids, { done: false });
							if (value === "text") store.setTaskMany(ids, null);
						}}
					>
						<Menu.RadioItem
							value="text"
							disabled={locked}
							icon={<CircleIcon size={6} weight="fill" />}
						>
							Text
						</Menu.RadioItem>
						<Menu.RadioItem
							value="task"
							icon={<CircleIcon size={14} />}
							disabled={locked}
						>
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
				<Menu.Submenu icon={<CalendarBlankIcon size={15} />} label="Due date">
					<Menu.Item disabled={locked} onClick={() => setDue(new Date())}>
						Today
					</Menu.Item>
					<Menu.Item
						disabled={locked}
						onClick={() => setDue(shiftDay(null, 1))}
					>
						Tomorrow
					</Menu.Item>
					<Menu.Item
						disabled={locked}
						onClick={() => setDue(shiftDay(null, 7))}
					>
						Next week
					</Menu.Item>
					<Menu.Item
						icon={<CalendarXIcon size={15} />}
						disabled={locked || !ids.some((id) => store.get(id)?.due)}
						onClick={() => setDue(null)}
					>
						Remove due date
					</Menu.Item>
					{!locked && (
						<>
							<Menu.Separator />
							<Menu.Custom label="Calendar">
								<Calendar
									value={node.due ? fromIsoDay(node.due) : undefined}
									onChange={setDue}
								/>
							</Menu.Custom>
						</>
					)}
				</Menu.Submenu>
				<Menu.Item
					icon={<MagnifyingGlassPlusIcon size={15} />}
					disabled={batch}
					onClick={() => onZoomIn?.(node.id)}
				>
					Zoom in
				</Menu.Item>
				<Menu.Item icon={<ArrowSquareOutIcon size={15} />} disabled>
					Open in new pane
				</Menu.Item>
				<Menu.Separator />
				<Menu.Submenu icon={<CopyIcon size={15} />} label="Duplicate">
					<Menu.Item disabled={locked} onClick={() => store.duplicateMany(ids)}>
						Duplicate selected
					</Menu.Item>
					<Menu.Item
						disabled={locked || (!batch && childCount === 0)}
						onClick={() => store.duplicateMany(ids, true)}
					>
						Duplicate with children
					</Menu.Item>
				</Menu.Submenu>
				<Menu.Item
					icon={<ArrowLineRightIcon size={15} />}
					disabled={!ids.some(store.canIndent)}
					onClick={() => store.indentMany(ids)}
				>
					Indent{count}
				</Menu.Item>
				<Menu.Item
					icon={<ArrowLineLeftIcon size={15} />}
					disabled={!ids.some(store.canOutdent)}
					onClick={() => store.outdentMany(ids)}
				>
					Outdent{count}
				</Menu.Item>
				<Menu.Separator />
				<Menu.Item icon={<SparkleIcon size={15} />} disabled>
					Break into steps
				</Menu.Item>
				<Menu.Item
					icon={<LinkSimpleIcon size={15} />}
					disabled={batch}
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
					danger
					onClick={() => store.removeMany(ids)}
				>
					Delete{count}
				</Menu.Item>
			</Menu.Popup>
		</Menu.Root>
	);
});
