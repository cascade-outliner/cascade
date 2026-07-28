import { TrashIcon } from "@phosphor-icons/react/ssr";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useState } from "react";
import { m } from "#/paraglide/messages.js";
import type { TreeHistorySummary } from "@/features/tree-history/model/tree-history.schema";
import { actionLabel } from "./event-preview";
import { historyListItem } from "./tree-history.styles";

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

export function TreeHistoryTimeline({
	items,
	selectedId,
	onSelect,
	hasNextPage,
	isFetchingNextPage,
	onLoadMore,
}: {
	items: TreeHistorySummary[];
	selectedId: string | undefined;
	onSelect: (id: string) => void;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	onLoadMore: () => void;
}) {
	const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
		null,
	);

	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => scrollElement,
		estimateSize: () => 62,
		overscan: 8,
		getItemKey: (index) => items[index]?.id ?? index,
	});
	const virtualItems = virtualizer.getVirtualItems();

	useEffect(() => {
		const last = virtualItems.at(-1);
		if (
			last &&
			last.index >= items.length - 5 &&
			hasNextPage &&
			!isFetchingNextPage
		) {
			onLoadMore();
		}
	}, [items.length, hasNextPage, isFetchingNextPage, onLoadMore, virtualItems]);

	return (
		<div
			ref={setScrollElement}
			className="min-h-0 overflow-auto border-ink/10 border-b md:border-r md:border-b-0 dark:border-surface/15"
		>
			<div className="relative" style={{ height: virtualizer.getTotalSize() }}>
				{virtualItems.map((virtualItem) => {
					const item = items[virtualItem.index];
					if (!item) return null;
					return (
						<button
							key={virtualItem.key}
							ref={virtualizer.measureElement}
							data-index={virtualItem.index}
							type="button"
							onClick={() => onSelect(item.id)}
							className={historyListItem({ selected: item.id === selectedId })}
							style={{
								transform: `translateY(${virtualItem.start}px)`,
							}}
						>
							<span className="flex w-full items-center gap-1 font-medium text-sm">
								{item.nodeDeleted && <TrashIcon size={13} />}
								<span className="truncate">
									{actionLabel(item.kind)} ·{" "}
									{item.label || m.breadcrumbs_untitled()}
								</span>
							</span>
							<span className="text-ink/55 text-xs dark:text-surface/55">
								{timestampFormatter.format(new Date(item.createdAt))}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
