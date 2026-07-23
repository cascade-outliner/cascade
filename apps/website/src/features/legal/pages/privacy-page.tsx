import { m } from "#/paraglide/messages.js";
import {
	LegalDocumentPage,
	type LegalSection,
} from "../components/legal-document-page";

export function PrivacyPage() {
	const sections: LegalSection[] = [
		{
			heading: m.privacy_info_collect_heading(),
			body: m.privacy_info_collect_body(),
		},
		{
			heading: m.privacy_info_use_heading(),
			body: m.privacy_info_use_body(),
		},
		{
			heading: m.privacy_data_storage_heading(),
			body: m.privacy_data_storage_body(),
		},
		{
			heading: m.privacy_cookies_heading(),
			body: m.privacy_cookies_body(),
		},
		{
			heading: m.privacy_your_rights_heading(),
			body: m.privacy_your_rights_body(),
		},
		{
			heading: m.privacy_changes_heading(),
			body: m.privacy_changes_body(),
		},
	];

	return (
		<LegalDocumentPage
			title={m.privacy_heading()}
			lastUpdated={m.privacy_last_updated()}
			introduction={m.privacy_intro()}
			sections={sections}
			contactHeading={m.privacy_contact_heading()}
			contactBody={m.privacy_contact_body()}
		/>
	);
}
