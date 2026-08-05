import { NodeTagPills } from "@cascade/outliner/features/tags/node-tags-pills";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ssr";
import { Link } from "@tanstack/react-router";
import { m } from "#/paraglide/messages.js";
import { toNodeSlug } from "@/features/nodes/model/node-slug";
import type { AgendaRow as AgendaRowData } from "../model/build-agenda-groups";
import { row as rowStyles } from "./agenda.styles";

export function AgendaRow({ row }: { row: AgendaRowData }) {
	return (
		<Link
			viewTransition
			to="/$nodeSlug"
			params={{ nodeSlug: toNodeSlug(row) }}
			search={true}
			className={rowStyles()}
		>
			<span className="min-w-0 flex-1 truncate">
				{row.title || m.agenda_untitled()}
			</span>
			{row.recurrence && (
				<ArrowsClockwiseIcon
					size={13}
					weight="bold"
					aria-label={m.agenda_recurring_label()}
					className="shrink-0 text-muted dark:text-surface/60"
				/>
			)}
			{row.tags.length > 0 && <NodeTagPills tags={row.tags} />}
		</Link>
	);
}
