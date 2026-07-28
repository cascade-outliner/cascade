import { MAX_VISIBLE_TAGS, tagPill } from "./tag-pill.styles";
import { TagPillRow } from "./tag-pill-row";

export { NodeTagsControl } from "./node-tags-control";

/** Displays a tree row's visible tag pills and overflow count. */
export function NodeTagPills({
	tags,
	onTagClick,
}: {
	tags: string[];
	onTagClick?: (tag: string) => void;
}) {
	const hidden = tags.slice(MAX_VISIBLE_TAGS);

	return (
		<TagPillRow tags={tags} onTagClick={onTagClick}>
			{hidden.length > 0 && (
				<span
					className={tagPill({ className: "tabular-nums" })}
					title={hidden.join(", ")}
				>
					+{hidden.length}
				</span>
			)}
		</TagPillRow>
	);
}
