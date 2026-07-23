import { PublicPageLayout } from "#/components/site/public-page-layout";
import { m } from "#/paraglide/messages.js";
import { changelogEntries } from "../data/changelog-entries";
import { ChangelogItemBadge } from "./changelog-item-badge";

export function ChangelogPage() {
	return (
		<PublicPageLayout>
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
		</PublicPageLayout>
	);
}
