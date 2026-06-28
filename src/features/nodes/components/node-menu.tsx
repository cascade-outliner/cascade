import { Menu } from "@base-ui/react/menu";
import { DotsThreeIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "#/orpc/client";
import type { NodeWithMeta } from "../schema";

export function NodeMenu({ node }: { node: NodeWithMeta }) {
	const queryClient = useQueryClient();
	const { mutate: deleteNode } = useMutation({
		...orpc.deleteNode.mutationOptions(),
		onSuccess: () => {
			if (node.parentId) {
				queryClient.invalidateQueries(
					orpc.getChildren.queryOptions({ input: { parentId: node.parentId } }),
				);
			} else {
				queryClient.invalidateQueries(orpc.listNodes.queryOptions());
			}
		},
	});

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
						<Menu.Item
							className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
							onClick={() => deleteNode({ id: node.id })}
						>
							<TrashIcon size={14} />
							Delete
						</Menu.Item>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
