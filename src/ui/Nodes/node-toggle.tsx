import { CaretRightIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NodeType } from "#/core/nodes/node.types";
import { cva } from "#/integrations/cva/cva.config";
import { orpc } from "#/orpc/client";

interface NodeToggleProps
	extends Pick<NodeType, "hasChildren" | "expanded" | "id" | "parentId"> {}

const nodeToggleCaret = cva({
	base: ["transition-transform"],
	variants: {
		rotation: {
			expanded: ["rotate-90"],
			collapsed: [],
		},
	},
});

export function NodeToggle({
	hasChildren,
	expanded,
	id,
	parentId,
}: NodeToggleProps) {
	const queryClient = useQueryClient();
	const { mutate } = useMutation({
		...orpc.toggleNodeExpanded.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries(
				orpc.listNodes.queryOptions({ input: { parentId } }),
			);
		},
	});

	return (
		<>
			{hasChildren ? (
				<button
					type="button"
					onClick={() => mutate({ id, expanded: !expanded })}
					aria-label={expanded ? "Collapse" : "Expand"}
					aria-expanded={expanded}
					className="shrink-0 text-gray-400 hover:text-black transition-colors"
				>
					<CaretRightIcon
						className={nodeToggleCaret({
							rotation: expanded ? "expanded" : "collapsed",
						})}
					/>
				</button>
			) : (
				<span className="w-4 shrink-0" />
			)}
		</>
	);
}
