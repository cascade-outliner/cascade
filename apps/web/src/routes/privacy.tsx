import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "#/components/marketing/footer";
import { Nav } from "#/components/marketing/nav";
import { seoHead } from "#/lib/seo";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/privacy")({
	head: () =>
		seoHead(m.privacy_seo_title(), m.privacy_seo_description(), "/privacy"),
	component: Privacy,
});

function Privacy() {
	return (
		<>
			<Nav />
			<main className="prose mx-auto max-w-3xl p-8 min-h-128">
				<h1 className="font-serif text-4xl italic mb-2">
					{m.privacy_heading()}
				</h1>
				<p className="text-sm text-graphite">{m.privacy_last_updated()}</p>

				<p>{m.privacy_intro()}</p>

				<h2>{m.privacy_info_collect_heading()}</h2>
				<p>{m.privacy_info_collect_body()}</p>

				<h2>{m.privacy_info_use_heading()}</h2>
				<p>{m.privacy_info_use_body()}</p>

				<h2>{m.privacy_data_storage_heading()}</h2>
				<p>{m.privacy_data_storage_body()}</p>

				<h2>{m.privacy_cookies_heading()}</h2>
				<p>{m.privacy_cookies_body()}</p>

				<h2>{m.privacy_your_rights_heading()}</h2>
				<p>{m.privacy_your_rights_body()}</p>

				<h2>{m.privacy_changes_heading()}</h2>
				<p>{m.privacy_changes_body()}</p>

				<h2>{m.privacy_contact_heading()}</h2>
				<p>
					{m.privacy_contact_body()}{" "}
					<a href="mailto:contact@patrickroelofs.com">
						contact@patrickroelofs.com
					</a>
					.
				</p>
			</main>
			<Footer />
		</>
	);
}
