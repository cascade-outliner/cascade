import { DotsSixVerticalIcon } from "@phosphor-icons/react/ssr";
import { forwardRef } from "react";
import { useOutlinerLabels } from "./labels-context";

export const NodeDragHandle = forwardRef<HTMLButtonElement>(
	function NodeDragHandle(_props, ref) {
		const labels = useOutlinerLabels();
		return (
			<button
				ref={ref}
				type="button"
				aria-label={labels.dragToReorder}
				className="shrink-0 cursor-grab touch-none text-dark-grey dark:text-ginger opacity-0 group-hover/node:opacity-100 group-focus-within/node:opacity-100 pointer-coarse:opacity-100 transition-opacity"
			>
				<DotsSixVerticalIcon size={16} />
			</button>
		);
	},
);
