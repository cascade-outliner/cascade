import { Checkbox } from "@cascade/ui/checkbox";
import type { NodeMetadataOf } from "@/core/nodes/node-types";

interface NodeCheckboxProps {
	metadata: unknown;
	onToggle: (completed: boolean) => void;
}

/** Completion checkbox for task-type nodes. */
export function NodeCheckbox({ metadata, onToggle }: NodeCheckboxProps) {
	return (
		<Checkbox
			aria-label="Task completed"
			checked={(metadata as NodeMetadataOf<"task"> | null)?.completed ?? false}
			onCheckedChange={onToggle}
			onClick={(e) => e.stopPropagation()}
		/>
	);
}
