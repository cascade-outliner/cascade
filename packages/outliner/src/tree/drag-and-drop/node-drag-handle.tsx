import { usePointerIntentTarget } from "@cascade/ui/use-pointer-intent-target";
import { DotsSixVerticalIcon } from "@phosphor-icons/react/ssr";
import type { Ref } from "react";
import { forwardRef, useId, useMemo } from "react";
import { useOutlinerLabels } from "../../i18n/outliner-labels-context";

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
	return (node: T | null) => {
		for (const ref of refs) {
			if (typeof ref === "function") ref(node);
			else if (ref) (ref as { current: T | null }).current = node;
		}
	};
}

export const NodeDragHandle = forwardRef<HTMLButtonElement>(
	function NodeDragHandle(_props, ref) {
		const labels = useOutlinerLabels();
		// A pure drag source, not a click-activatable control: it competes for
		// space in the intent-redirect geometry but is never itself a target.
		const intentRef = usePointerIntentTarget({
			id: useId(),
			activatable: false,
		});
		// Memoized so identity stays stable across renders — an inline merge
		// would re-fire both ref callbacks (unregistering/reregistering the
		// intent candidate) on every render instead of just mount/unmount.
		const mergedRef = useMemo(
			() => mergeRefs(ref, intentRef),
			[ref, intentRef],
		);
		return (
			<button
				ref={mergedRef}
				type="button"
				aria-label={labels.dragToReorder}
				className="shrink-0 cursor-grab touch-none text-ink dark:text-surface opacity-0 group-hover/node:opacity-100 group-focus-within/node:opacity-100 pointer-coarse:opacity-100"
			>
				<DotsSixVerticalIcon size={16} />
			</button>
		);
	},
);
