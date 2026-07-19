import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";

interface NodeDropIndicatorProps {
	instruction: Instruction | null;
}

export function NodeDropIndicator({ instruction }: NodeDropIndicatorProps) {
	if (!instruction || instruction.type === "instruction-blocked") return null;

	return (
		<div
			className={
				instruction.type === "make-child"
					? "absolute inset-0 rounded ring-2 ring-inset ring-danger pointer-events-none"
					: `absolute left-0 right-0 h-0.5 bg-danger pointer-events-none ${
							instruction.type === "reorder-above" ? "top-0" : "bottom-0"
						}`
			}
		/>
	);
}
