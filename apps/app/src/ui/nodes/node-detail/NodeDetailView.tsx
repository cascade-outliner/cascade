import { LexicalReadView } from "@cascade/outliner/lexical/read/lexical-read-view";
import {
	lexicalToPlainText,
	toLexicalContent,
} from "@cascade/outliner/lexical-content";
import { NodeCheckbox } from "@cascade/outliner/node-checkbox";
import { NodeDueDatePill } from "@cascade/outliner/node-due-date-pill";
import type { TagSummary } from "@cascade/outliner/node-tags";
import { NodeTagsControl } from "@cascade/outliner/node-tags-pills";
import { Link } from "@tanstack/react-router";
import { m } from "#/paraglide/messages.js";
import { Breadcrumbs } from "#/ui/nodes/breadcrumbs";
import { toNodeSlug } from "#/ui/nodes/node-slug";
import type { NodeDetailData } from "./types";

export function NodeDetailHeader({
	node,
	backlinks,
	dueDate,
	completed,
	existingTags,
	onToggleTask,
	onDueDateChange,
	onTagsChange,
	onDeleteTag,
}: {
	node: NodeDetailData;
	backlinks: { id: string; content: unknown }[];
	dueDate: Date | null;
	completed: boolean;
	existingTags: TagSummary[];
	onToggleTask: (completed: boolean) => void;
	onDueDateChange: (dueDate: Date | null) => void;
	onTagsChange: (tags: string[]) => void;
	onDeleteTag: (tag: string) => void;
}) {
	return (
		<>
			<Breadcrumbs nodeId={node.id} />
			<header
				style={{ viewTransitionName: `node-${node.id}` }}
				className="group/node mb-8 flex flex-col gap-3 text-2xl"
			>
				<div className="flex items-center gap-3">
					{node.type === "task" && (
						<NodeCheckbox metadata={node.metadata} onToggle={onToggleTask} />
					)}
					<LexicalReadView content={toLexicalContent(node.content)} />
				</div>

				<div className="flex items-start gap-1">
					{dueDate && (
						<NodeDueDatePill
							dueDate={dueDate}
							completed={completed}
							onChange={onDueDateChange}
						/>
					)}
					<NodeTagsControl
						tags={node.tags}
						existingTags={existingTags}
						onChange={onTagsChange}
						onDeleteTag={onDeleteTag}
					/>
				</div>

				{backlinks.length > 0 && (
					<section aria-labelledby="node-backlinks-heading" className="mt-2">
						<h2
							id="node-backlinks-heading"
							className="text-sm font-medium text-muted"
						>
							{m.node_backlinks_heading()}
						</h2>
						<ul className="mt-2 flex flex-col gap-1 text-sm">
							{backlinks.map((backlink) => (
								<li key={backlink.id}>
									<Link
										to="/$nodeSlug"
										params={{ nodeSlug: toNodeSlug(backlink) }}
										search={true}
										className="underline-offset-2 hover:underline"
									>
										{lexicalToPlainText(backlink.content).trim() ||
											m.breadcrumbs_untitled()}
									</Link>
								</li>
							))}
						</ul>
					</section>
				)}
			</header>
		</>
	);
}
