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
				className="shrink-0 cursor-grab touch-none text-ink dark:text-surface opacity-0 group-hover/node:opacity-100 group-focus-within/node:opacity-100 pointer-coarse:opacity-100"
			>
				<DotsSixVerticalIcon size={16} />
			</button>
		);
	},
);
