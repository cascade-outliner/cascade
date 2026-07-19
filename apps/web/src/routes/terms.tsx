import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "#/components/marketing/footer";
import { Nav } from "#/components/marketing/nav";
import { seoHead } from "#/lib/seo";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/terms")({
	head: () => seoHead(m.terms_seo_title(), m.terms_seo_description(), "/terms"),
	component: Terms,
});

function Terms() {
	return (
		<>
			<Nav />
			<main className="prose mx-auto max-w-3xl p-8 min-h-128">
				<h1 className="font-serif text-4xl italic mb-2">{m.terms_heading()}</h1>
				<p className="text-sm text-muted">{m.terms_last_updated()}</p>

				<p>{m.terms_intro()}</p>

				<h2>{m.terms_using_heading()}</h2>
				<p>{m.terms_using_body()}</p>

				<h2>{m.terms_content_heading()}</h2>
				<p>{m.terms_content_body()}</p>

				<h2>{m.terms_acceptable_use_heading()}</h2>
				<p>{m.terms_acceptable_use_body()}</p>

				<h2>{m.terms_termination_heading()}</h2>
				<p>{m.terms_termination_body()}</p>

				<h2>{m.terms_disclaimer_heading()}</h2>
				<p>{m.terms_disclaimer_body()}</p>

				<h2>{m.terms_changes_heading()}</h2>
				<p>{m.terms_changes_body()}</p>

				<h2>{m.terms_contact_heading()}</h2>
				<p>
					{m.terms_contact_body()}{" "}
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
