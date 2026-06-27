import { Menu } from "@base-ui/react/menu";
import { DotsThreeIcon } from "@phosphor-icons/react/ssr";
import type { NodeWithMeta } from "#/db/schema";

export function NodeMenu({ node }: { node: NodeWithMeta }) {
	return (
		<Menu.Root>
			<Menu.Trigger
				className="opacity-0 group-hover/node:opacity-100 transition-opacity shrink-0 text-gray-400 hover:text-gray-700 p-0.5 rounded"
				aria-label="Node options"
			>
				<DotsThreeIcon size={16} weight="bold" />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner side="bottom" align="end" sideOffset={4}>
					<Menu.Popup className="bg-white border border-gray-200 rounded shadow-md py-1 min-w-32 z-50">
						{/* ponytail: no items yet, add buttons here */}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
