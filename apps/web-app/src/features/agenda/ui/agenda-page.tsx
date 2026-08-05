import { Checkbox } from "@cascade/ui/checkbox";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { visibleTreeOptions } from "@/features/nodes/client/tree/visible-tree-query";
import { buildAgendaGroups } from "../model/build-agenda-groups";
import { AgendaSection } from "./agenda-section";

export function AgendaPage() {
	const { data } = useSuspenseQuery(visibleTreeOptions());
	const [hideCompleted, setHideCompleted] = useState(true);
	const sections = buildAgendaGroups(data.rows, { hideCompleted });
	const hideCompletedId = useId();

	return (
		<div className="mx-auto max-w-2xl px-4 py-24">
			<div className="mb-6 flex items-center justify-between gap-4">
				<h1 className="font-serif text-2xl italic">{m.agenda_heading()}</h1>
				<label
					htmlFor={hideCompletedId}
					className="flex shrink-0 items-center gap-2 text-sm text-muted dark:text-surface/60"
				>
					<Checkbox
						id={hideCompletedId}
						aria-label={m.agenda_hide_completed_toggle()}
						checked={hideCompleted}
						onCheckedChange={(checked) => setHideCompleted(checked === true)}
					/>
					{m.agenda_hide_completed_toggle()}
				</label>
			</div>

			{sections.length === 0 ? (
				<p className="text-muted dark:text-surface/60">{m.agenda_empty()}</p>
			) : (
				sections.map((section) => (
					<AgendaSection key={section.kind} section={section} />
				))
			)}
		</div>
	);
}
