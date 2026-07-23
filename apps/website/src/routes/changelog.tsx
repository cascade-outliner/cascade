import { cva } from "@cascade/ui/cva.config";
import { createFileRoute } from "@tanstack/react-router";
import { type ChangelogItemType, changelogEntries } from "#/changelog";
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

const typeBadge = cva({
	base: "relative -top-px mr-1.5 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium align-middle",
	variants: {
		type: {
			feat: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-400/15 dark:text-emerald-300",
			fix: "border-amber-600/30 bg-amber-600/10 text-amber-700 dark:border-amber-400/35 dark:bg-amber-400/15 dark:text-amber-300",
			chore:
				"border-ink/15 bg-transparent text-muted dark:border-surface/15 dark:text-surface/60",
		} satisfies Record<ChangelogItemType, string>,
	},
});

function ChangelogItemBadge({ type }: { type: ChangelogItemType }) {
	const label = {
		feat: m.changelog_label_feat(),
		fix: m.changelog_label_fix(),
		chore: m.changelog_label_chore(),
	}[type];
	return <span className={typeBadge({ type })}>{label}</span>;
}

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
						<div className="prose max-w-none space-y-2">
							{entry.items.map((item, index) => (
								<p
									// biome-ignore lint/suspicious/noArrayIndexKey: entries are a static, unreordered list parsed from CHANGELOG.md
									key={index}
								>
									{item.type && <ChangelogItemBadge type={item.type} />}
									<span
										// biome-ignore lint/security/noDangerouslySetInnerHtml: content is authored by the repo (CHANGELOG.md), not user input
										dangerouslySetInnerHTML={{ __html: item.html }}
									/>
								</p>
							))}
						</div>
					</div>
				))}
			</main>
			<Footer />
		</>
	);
}
