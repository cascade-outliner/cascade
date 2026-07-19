import { createFileRoute } from "@tanstack/react-router";
import { changelogEntries } from "#/changelog";
import { Footer } from "#/components/marketing/footer";
import { Nav } from "#/components/marketing/nav";
import { seoHead } from "#/lib/seo";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/changelog")({
	head: () =>
		seoHead(
			m.changelog_seo_title(),
			m.changelog_seo_description(),
			"/changelog",
		),
	component: Changelog,
});

function Changelog() {
	return (
		<>
			<Nav />
			<main className="mx-auto max-w-3xl p-8 min-h-128">
				<h1 className="mb-8 font-serif text-4xl italic">
					{m.changelog_heading()}
				</h1>
				{changelogEntries.map((entry) => (
					<div key={entry.id} className="mb-8 last:mb-0">
						<h2 className="mb-2 text-sm font-semibold text-ink/60">
							{entry.id}
						</h2>
						<div
							className="prose max-w-none"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: content is authored by the repo (CHANGELOG.md), not user input
							dangerouslySetInnerHTML={{ __html: entry.html }}
						/>
					</div>
				))}
			</main>
			<Footer />
		</>
	);
}
