import { XIcon } from "@phosphor-icons/react/ssr";
import type { TagSummary } from "@/core/tags/tag.types";

interface TagChipProps {
	tag: TagSummary;
	onRemove?: () => void;
}

/** Small colored pill for a tag; purely presentational. */
export function TagChip({ tag, onRemove }: TagChipProps) {
	return (
		<span
			className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
			style={{ backgroundColor: tag.color }}
		>
			{tag.name}
			{onRemove && (
				<button
					type="button"
					aria-label={`Remove tag ${tag.name}`}
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					className="flex cursor-pointer items-center justify-center rounded-full outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-white/70"
				>
					<XIcon size={10} weight="bold" />
				</button>
			)}
		</span>
	);
}
