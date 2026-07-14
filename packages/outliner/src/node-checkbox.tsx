import { Checkbox } from "@cascade/ui/checkbox";
import { useOutlinerLabels } from "./labels-context";
import type { NodeMetadata } from "./node-types";

interface NodeCheckboxProps {
	metadata: NodeMetadata;
	onToggle: (completed: boolean) => void;
}

/** Completion checkbox for task-type nodes. */
export function NodeCheckbox({ metadata, onToggle }: NodeCheckboxProps) {
	const labels = useOutlinerLabels();
	return (
		<Checkbox
			aria-label={labels.taskCompleted}
			checked={metadata?.completed ?? false}
			onCheckedChange={onToggle}
			onClick={(e) => e.stopPropagation()}
		/>
	);
}
