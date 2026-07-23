import { m } from "#/paraglide/messages.js";
import {
	LegalDocumentPage,
	type LegalSection,
} from "../components/legal-document-page";

export function TermsPage() {
	const sections: LegalSection[] = [
		{
			heading: m.terms_using_heading(),
			body: m.terms_using_body(),
		},
		{
			heading: m.terms_content_heading(),
			body: m.terms_content_body(),
		},
		{
			heading: m.terms_acceptable_use_heading(),
			body: m.terms_acceptable_use_body(),
		},
		{
			heading: m.terms_termination_heading(),
			body: m.terms_termination_body(),
		},
		{
			heading: m.terms_disclaimer_heading(),
			body: m.terms_disclaimer_body(),
		},
		{
			heading: m.terms_changes_heading(),
			body: m.terms_changes_body(),
		},
	];

	return (
		<LegalDocumentPage
			title={m.terms_heading()}
			lastUpdated={m.terms_last_updated()}
			introduction={m.terms_intro()}
			sections={sections}
			contactHeading={m.terms_contact_heading()}
			contactBody={m.terms_contact_body()}
		/>
	);
}
