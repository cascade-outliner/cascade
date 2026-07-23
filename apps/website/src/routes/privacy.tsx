import { createFileRoute } from "@tanstack/react-router";
import { PrivacyPage } from "#/features/legal/pages/privacy-page";
import { m } from "#/paraglide/messages.js";
import { seoHead } from "#/seo/seo-head";

export const Route = createFileRoute("/privacy")({
	head: () =>
		seoHead(m.privacy_seo_title(), m.privacy_seo_description(), "/privacy"),
	component: PrivacyPage,
});
