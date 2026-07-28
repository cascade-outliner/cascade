import { Checkbox } from "@cascade/ui/checkbox";
import { usePointerIntentTarget } from "@cascade/ui/use-pointer-intent-target";
import { useId } from "react";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import type { NodeMetadata } from "../../../nodes/model/node-types";

interface NodeCheckboxProps {
	metadata: NodeMetadata;
	onToggle: (completed: boolean) => void;
}

/** Completion checkbox for task-type nodes. */
export function NodeCheckbox({ metadata, onToggle }: NodeCheckboxProps) {
	const labels = useOutlinerLabels();
	const intentRef = usePointerIntentTarget({ id: useId() });
	return (
		<Checkbox
			ref={intentRef}
			aria-label={labels.taskCompleted}
			checked={metadata?.completed ?? false}
			onCheckedChange={onToggle}
			onClick={(e) => e.stopPropagation()}
		/>
	);
}
