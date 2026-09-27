import type { Node, Row } from "@cascade/data";
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
import { observer } from "mobx-react-lite";
import { type ReactNode, useState } from "react";
import { useOutlineStore } from "#/lib/outline-store.tsx";

export interface OutlinerContextMenuProps {
	/** The rows the menu can open on; each row element carries `data-node-id`. */
	rows: Row[];
	children: ReactNode;
	/** Called with the row the menu opened on, and `null` when it closes. */
	onOpenChange?: (id: string | null) => void;
	onZoomIn?: (id: string) => void;
}

/**
 * One menu for the whole outline, opened on whichever row was right-clicked.
 * A menu per row made every row scrolled into view mount a menu root and trigger.
 */
export function OutlinerContextMenu({
	rows,
	children,
	onOpenChange,
	onZoomIn,
}: OutlinerContextMenuProps) {
	// Kept after closing, so the popup's exit animation still has its items.
	const [target, setTarget] = useState<Row | null>(null);

	return (
		<Menu.Root
			onOpenChange={(open, details) => {
				if (!open) {
					onOpenChange?.(null);
					return;
				}
				// A right-click or long-press always targets an element.
				const id = (details.event.target as Element).closest<HTMLElement>(
					"[data-node-id]",
				)?.dataset.nodeId;
				const row = rows.find((row) => row.node.id === id);
				if (!row) {
					// Between rows, or outside them: nothing to act on.
					details.cancel();
					return;
				}
				setTarget(row);
				onOpenChange?.(row.node.id);
			}}
		>
			<Menu.Trigger>{children}</Menu.Trigger>
			<Menu.Popup>
				{target && (
					<MenuItems
						node={target.node}
						childCount={target.childCount}
						onZoomIn={onZoomIn}
					/>
				)}
			</Menu.Popup>
		</Menu.Root>
	);
}

const MenuItems = observer(function MenuItems({
	node,
	childCount,
	onZoomIn,
}: {
	node: Node;
	childCount: number;
	onZoomIn?: (id: string) => void;
}) {
	const store = useOutlineStore();
	// Opened on a selected row, the actions apply to the whole selection.
	const batch = store.selection.has(node.id) && store.selection.size > 1;
	const ids = batch ? [...store.selection] : [node.id];
	const count = batch ? ` ${ids.length} nodes` : "";

	return (
		<>
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
				<Menu.Item onClick={() => store.duplicateMany(ids)}>
					Duplicate selected
				</Menu.Item>
				<Menu.Item
					disabled={!batch && childCount === 0}
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
		</>
	);
});
