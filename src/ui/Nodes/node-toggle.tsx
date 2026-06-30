import { CaretRightIcon } from "@phosphor-icons/react";
import type { Dispatch, SetStateAction } from "react";
import type { NodeType } from "#/core/nodes/node.types";
import { cva } from "#/integrations/cva/cva.config";

interface NodeToggleProps extends Pick<NodeType, "hasChildren"> {
	expanded: boolean;
	setExpanded: Dispatch<SetStateAction<boolean>>;
}

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
	expanded,
	setExpanded,
	hasChildren,
}: NodeToggleProps) {
	return (
		<>
			{hasChildren ? (
				<button
					type="button"
					onClick={() => setExpanded((e) => !e)}
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
