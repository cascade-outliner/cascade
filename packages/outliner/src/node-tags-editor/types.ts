import type { TagSummary } from "../node-tags";

export interface NodeTagsEditorProps {
	tags: string[];
	/** All of this user's tags with usage counts (already sorted by name). */
	existingTags: TagSummary[];
	onChange: (tags: string[]) => void;
	/** Deletes the tag outright (every node that has it loses it), not just
	 * this node's use of it. Omit to hide the delete affordance. */
	onDeleteTag?: (name: string) => void | Promise<void>;
}
