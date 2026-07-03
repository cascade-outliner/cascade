import { ContextMenu } from "@base-ui/react";
import {
	ArrowsClockwiseIcon,
	CaretRightIcon,
	TrashIcon,
} from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import {
	type NodeTypeName,
	nodeTypeDefs,
	nodeTypeNames,
} from "@/core/nodes/node-types";

interface NodeActionsProps {
	nodeType: NodeTypeName;
	onConvert: (type: NodeTypeName) => void;
	onDelete: () => void;
	viewTransitionName?: string;
	children: ReactNode;
}

const popupClassName =
	"origin-[var(--transform-origin)] min-w-40 rounded-lg border border-dark-grey/10 bg-white p-1 text-dark-grey shadow-lg shadow-dark-grey/15 transition-[transform,opacity] duration-150 ease-out data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0";

const itemClassName =
	"flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-none data-[highlighted]:bg-ginger/70";

export function NodeActions({
	nodeType,
	onConvert,
	onDelete,
	viewTransitionName,
	children,
}: NodeActionsProps) {
	return (
		<ContextMenu.Root>
			<ContextMenu.Trigger
				className="flex items-center gap-2 min-w-0 flex-1"
				style={{ viewTransitionName }}
			>
				{children}
			</ContextMenu.Trigger>
			<ContextMenu.Portal>
				<ContextMenu.Positioner className="z-50 outline-none">
					<ContextMenu.Popup className={popupClassName}>
						<ContextMenu.SubmenuRoot>
							<ContextMenu.SubmenuTrigger
								className={`${itemClassName} justify-between`}
							>
								<span className="flex items-center gap-2">
									<ArrowsClockwiseIcon size={14} weight="bold" />
									Convert into
								</span>
								<CaretRightIcon size={14} weight="bold" />
							</ContextMenu.SubmenuTrigger>
							<ContextMenu.Portal>
								<ContextMenu.Positioner className="z-50 outline-none">
									<ContextMenu.Popup className={popupClassName}>
										{nodeTypeNames
											.filter((type) => type !== nodeType)
											.map((type) => (
												<ContextMenu.Item
													key={type}
													className={itemClassName}
													onClick={() => onConvert(type)}
												>
													{nodeTypeDefs[type].label}
												</ContextMenu.Item>
											))}
									</ContextMenu.Popup>
								</ContextMenu.Positioner>
							</ContextMenu.Portal>
						</ContextMenu.SubmenuRoot>
						<ContextMenu.Separator className="my-1 h-px bg-dark-grey/10" />
						<ContextMenu.Item
							className={`${itemClassName} text-redleather`}
							onClick={onDelete}
						>
							<TrashIcon size={14} weight="bold" />
							Delete
						</ContextMenu.Item>
					</ContextMenu.Popup>
				</ContextMenu.Positioner>
			</ContextMenu.Portal>
		</ContextMenu.Root>
	);
}
