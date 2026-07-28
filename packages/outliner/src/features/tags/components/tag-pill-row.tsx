import { AnimatePresence, m } from "@cascade/ui/motion";
import {
	smallEnterVariants,
	smallExitVariants,
} from "@cascade/ui/motion-variants";
import { TagIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { tagHue } from "../../../nodes/model/node-tags";
import { MAX_VISIBLE_TAGS, tagPill } from "./tag-pill.styles";

interface TagPillRowProps {
	tags: string[];
	onTagClick?: (tag: string) => void;
	children?: ReactNode;
}

/** Shared visible-tag row used by display and management controls. */
export function TagPillRow({ tags, onTagClick, children }: TagPillRowProps) {
	return (
		<span className="inline-flex max-w-full items-center gap-1">
			<AnimatePresence initial={false}>
				{tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => {
					const content = (
						<>
							<TagIcon size={11} weight="bold" />
							<span className="max-w-28 shrink-0 overflow-hidden text-ellipsis">
								{tag}
							</span>
						</>
					);

					return (
						<m.span
							key={tag}
							className="inline-flex min-w-0 max-w-full"
							variants={{ ...smallEnterVariants, ...smallExitVariants }}
							initial="initial"
							animate="animate"
							exit="exit"
						>
							{onTagClick ? (
								<button
									type="button"
									className={tagPill({
										hue: tagHue(tag),
										filterable: true,
									})}
									onClick={(event) => {
										event.stopPropagation();
										onTagClick(tag);
									}}
								>
									{content}
								</button>
							) : (
								<span className={tagPill({ hue: tagHue(tag) })}>{content}</span>
							)}
						</m.span>
					);
				})}
			</AnimatePresence>
			{children}
		</span>
	);
}
