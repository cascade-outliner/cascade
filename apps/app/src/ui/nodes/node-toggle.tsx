import { cva } from "@cascade/ui/cva.config";
import { CaretRightIcon } from "@phosphor-icons/react";

interface NodeToggleProps {
	hasChildren: boolean;
	expanded: boolean;
	onToggle: (expanded: boolean) => void;
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
	hasChildren,
	expanded,
	onToggle,
}: NodeToggleProps) {
	return (
		<>
			{hasChildren ? (
				<button
					type="button"
					onClick={() => onToggle(!expanded)}
					aria-label={expanded ? "Collapse" : "Expand"}
					aria-expanded={expanded}
					className="cursor-pointer shrink-0 p-1 -m-1 text-dark-grey hover:text-redleather dark:text-ginger dark:hover:text-redleather transition-colors"
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
