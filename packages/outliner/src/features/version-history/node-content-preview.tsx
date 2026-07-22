import { useVirtualizer } from "@tanstack/react-virtual";
import { useState } from "react";
import { parseCalendarDate } from "../../calendar-date";
import { useOutlinerLabels } from "../../labels-context";
import {
	lexicalToPlainText,
	toLexicalContent,
} from "../../lexical/lexical-content";
import { LexicalReadView } from "../../lexical/read/lexical-read-view";
import { DefaultNodeLink } from "../../node-link-slot";
import type { NodeTypeName } from "../../node-types";
import { StaticDueDatePill } from "../due-date/node-due-date-pill";
import { NodeTagPills } from "../tags/node-tags-pills";

export interface NodeContentPreviewRow {
	id: string;
	content: unknown;
	depth: number;
	/** Omitted for a normal content-edit version (there's no historical due
	 * date/tags to show — those columns aren't versioned, only `content` is)
	 * — present for a deleted-subtree preview, whose rows are read directly
	 * off the still-there `nodes`/`node_tags` rows. */
	type?: NodeTypeName;
	dueDate?: string | null;
	completed?: boolean;
	tags?: string[];
}

/** Read-only recreation of node content exactly as it looks in the outliner
 * — indentation, rich content, due-date and tag pills, no interactions
 * (drag, editing, context menu) since there's nothing here to act on. Used
 * for every version-history entry in place of a content diff: a single row
 * (depth 0) for a normal content-edit version, or the whole deleted
 * subtree's rows for a `descendantsDeleted` marker entry (see
 * `NodeVersionSummary`) — deletion never changed any node's content, so
 * there'd be nothing to diff there either.
 *
 * Virtualized the same way the outline itself and the version list are
 * (`@tanstack/react-virtual`): a deleted subtree can be arbitrarily large,
 * and mounting every row unvirtualized would be exactly the kind of
 * large-tree performance problem virtualization exists to avoid elsewhere.
 *
 * A row with no text at all (content is `null`, or an edited-then-cleared
 * empty structure) renders a plain "Empty" label instead of `LexicalReadView`
 * — which would otherwise render an indistinguishable blank line, easy to
 * mistake for a rendering glitch. */
export function NodeContentPreview({
	rows,
	indentSize = 16,
}: {
	rows: NodeContentPreviewRow[];
	indentSize?: number;
}) {
	const labels = useOutlinerLabels();
	const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scrollEl,
		estimateSize: () => 40,
		overscan: 8,
		getItemKey: (index) => rows[index]?.id ?? index,
	});

	return (
		<div ref={setScrollEl} className="h-full overflow-auto p-2">
			<div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
				{virtualizer.getVirtualItems().map((virtualItem) => {
					const row = rows[virtualItem.index];
					if (!row) return null;
					const dueDate = row.dueDate ? parseCalendarDate(row.dueDate) : null;
					const hasTrailing = dueDate || (row.tags && row.tags.length > 0);

					return (
						<div
							key={virtualItem.key}
							ref={virtualizer.measureElement}
							data-index={virtualItem.index}
							className="absolute top-0 left-0 flex w-full items-start gap-2 py-0.5"
							style={{
								transform: `translateY(${virtualItem.start}px)`,
								paddingLeft: row.depth * indentSize,
							}}
						>
							<span className="mt-2 shrink-0" aria-hidden>
								<DefaultNodeLink />
							</span>
							<div className="min-w-0 flex-1">
								{lexicalToPlainText(row.content) === "" ? (
									<p className="text-muted italic dark:text-canvas/50">
										{labels.versionHistoryEmptyContent}
									</p>
								) : (
									<LexicalReadView content={toLexicalContent(row.content)} />
								)}
								{hasTrailing && (
									<div className="flex flex-wrap items-center gap-1 pt-0.5">
										{dueDate && (
											<StaticDueDatePill
												dueDate={dueDate}
												completed={row.completed ?? false}
											/>
										)}
										{row.tags && row.tags.length > 0 && (
											<NodeTagPills tags={row.tags} />
										)}
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
