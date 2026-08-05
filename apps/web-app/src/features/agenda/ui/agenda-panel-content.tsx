import { useSuspenseQuery } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { visibleTreeOptions } from "@/features/nodes/client/tree/visible-tree-query";
import { AgendaPanelCloseContext } from "../model/agenda-panel-context";
import { buildAgendaGroups } from "../model/build-agenda-groups";
import { AgendaSection } from "./agenda-section";

export function AgendaPanelContent({
	hideCompleted,
	onNavigate,
}: {
	hideCompleted: boolean;
	onNavigate: () => void;
}) {
	const { data } = useSuspenseQuery(visibleTreeOptions());
	const sections = buildAgendaGroups(data.rows, { hideCompleted });

	return (
		<AgendaPanelCloseContext.Provider value={onNavigate}>
			{sections.length === 0 ? (
				<p className="text-muted dark:text-surface/60">{m.agenda_empty()}</p>
			) : (
				sections.map((section) => (
					<AgendaSection key={section.kind} section={section} />
				))
			)}
		</AgendaPanelCloseContext.Provider>
	);
}
