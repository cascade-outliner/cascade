import { Checkbox } from "@cascade/ui/checkbox";
import { useOutlinerLabels } from "./labels-context";
import type { NodeMetadataOf } from "./node-types";

interface NodeCheckboxProps {
	metadata: unknown;
	onToggle: (completed: boolean) => void;
}

/** Completion checkbox for task-type nodes. */
export function NodeCheckbox({ metadata, onToggle }: NodeCheckboxProps) {
	const labels = useOutlinerLabels();
	return (
		<Checkbox
			aria-label={labels.taskCompleted}
			checked={(metadata as NodeMetadataOf<"task"> | null)?.completed ?? false}
			onCheckedChange={onToggle}
			onClick={(e) => e.stopPropagation()}
		/>
	);
}
