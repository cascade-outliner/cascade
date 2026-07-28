import { cva } from "@cascade/ui/cva.config";
import { usePointerIntentTarget } from "@cascade/ui/use-pointer-intent-target";
import { CaretRightIcon } from "@phosphor-icons/react";
import { useId } from "react";
import { useOutlinerLabels } from "../../i18n/outliner-labels-context";

interface NodeToggleProps {
	hasChildren: boolean;
	expanded: boolean;
	onToggle: (expanded: boolean) => void;
}

const nodeToggleCaret = cva({
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
	const labels = useOutlinerLabels();
	const intentRef = usePointerIntentTarget({ id: useId() });
	return (
		<>
			{hasChildren ? (
				<button
					ref={intentRef}
					type="button"
					onClick={() => onToggle(!expanded)}
					aria-label={expanded ? labels.toggleCollapse : labels.toggleExpand}
					aria-expanded={expanded}
					className="cursor-pointer shrink-0 p-1 -m-1 text-ink hover:text-danger dark:text-surface dark:hover:text-danger"
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
