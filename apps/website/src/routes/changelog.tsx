import { createFileRoute } from "@tanstack/react-router";
import { ChangelogPage } from "#/features/changelog/components/changelog-page";
import { m } from "#/paraglide/messages.js";
import { seoHead } from "#/seo/seo-head";

export const Route = createFileRoute("/changelog")({
	head: () =>
		seoHead(
			m.changelog_seo_title(),
			m.changelog_seo_description(),
			"/changelog",
		),
	component: ChangelogPage,
});
