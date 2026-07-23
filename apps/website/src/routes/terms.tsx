import { createFileRoute } from "@tanstack/react-router";
import { TermsPage } from "#/features/legal/pages/terms-page";
import { m } from "#/paraglide/messages.js";
import { seoHead } from "#/seo/seo-head";

export const Route = createFileRoute("/terms")({
	head: () => seoHead(m.terms_seo_title(), m.terms_seo_description(), "/terms"),
	component: TermsPage,
});
