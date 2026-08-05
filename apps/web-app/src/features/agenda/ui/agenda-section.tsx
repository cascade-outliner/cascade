import { m } from "#/paraglide/messages.js";
import type { AgendaSection as AgendaSectionData } from "../model/build-agenda-groups";
import { sectionHeading } from "./agenda.styles";
import { AgendaDayGroup } from "./agenda-day-group";

const sectionLabels: Record<AgendaSectionData["kind"], () => string> = {
	overdue: m.agenda_section_overdue,
	today: m.agenda_section_today,
	"this-week": m.agenda_section_this_week,
	upcoming: m.agenda_section_upcoming,
};

export function AgendaSection({ section }: { section: AgendaSectionData }) {
	return (
		<section aria-label={sectionLabels[section.kind]()}>
			<h2 className={sectionHeading()}>{sectionLabels[section.kind]()}</h2>
			{section.days.map((day) => (
				<AgendaDayGroup key={day.date} group={day} kind={section.kind} />
			))}
		</section>
	);
}
