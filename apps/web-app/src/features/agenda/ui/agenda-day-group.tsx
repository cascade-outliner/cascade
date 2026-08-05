import { parseCalendarDate } from "@cascade/outliner/calendar-date";
import { m } from "#/paraglide/messages.js";
import type {
	AgendaDayGroup as AgendaDayGroupData,
	AgendaSectionKind,
} from "../model/build-agenda-groups";
import { dayHeading } from "./agenda.styles";
import { AgendaRow } from "./agenda-row";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	weekday: "short",
	month: "short",
	day: "numeric",
});

export function AgendaDayGroup({
	group,
	kind,
}: {
	group: AgendaDayGroupData;
	kind: AgendaSectionKind;
}) {
	return (
		<div className="mb-4">
			<h3 className={dayHeading({ kind })}>
				{dateFormatter.format(parseCalendarDate(group.date))}
				{kind === "overdue" && (
					<span className="text-xs font-semibold uppercase tracking-wide">
						{m.agenda_overdue_badge()}
					</span>
				)}
			</h3>
			<div className="flex flex-col">
				{group.rows.map((row) => (
					<AgendaRow key={row.id} row={row} />
				))}
			</div>
		</div>
	);
}
