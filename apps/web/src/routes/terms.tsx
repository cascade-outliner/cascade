import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "#/components/marketing/footer";
import { Nav } from "#/components/marketing/nav";
import { seoHead } from "#/lib/seo";

export const Route = createFileRoute("/terms")({
	head: () =>
		seoHead(
			"Terms of Service - Cascade",
			"The terms that govern your use of Cascade.",
			"/terms",
		),
	component: Terms,
});

function Terms() {
	return (
		<>
			<Nav />
			<main className="prose mx-auto max-w-3xl p-8 min-h-128">
				<h1 className="font-serif text-4xl italic mb-2">Terms of Service</h1>
				<p className="text-sm text-graphite">Last updated: July 7, 2026</p>

				<p>
					These Terms of Service ("Terms") govern your use of Cascade. By
					creating an account or using the app, you agree to these Terms.
				</p>

				<h2>Using Cascade</h2>
				<p>
					You must be able to form a binding contract to use Cascade, and you
					are responsible for maintaining the security of your account and for
					all activity that occurs under it.
				</p>

				<h2>Your content</h2>
				<p>
					You retain ownership of the content you create in Cascade. You grant
					us a license to host and process that content solely to provide the
					service to you.
				</p>

				<h2>Acceptable use</h2>
				<p>
					You agree not to misuse the service, including attempting to disrupt
					it, access it using unauthorized means, or use it for unlawful
					purposes.
				</p>

				<h2>Termination</h2>
				<p>
					You may stop using Cascade and delete your account at any time. We may
					suspend or terminate access if these Terms are violated.
				</p>

				<h2>Disclaimer and limitation of liability</h2>
				<p>
					Cascade is provided "as is" without warranties of any kind. To the
					extent permitted by law, we are not liable for indirect, incidental,
					or consequential damages arising from your use of the service.
				</p>

				<h2>Changes to these Terms</h2>
				<p>
					We may update these Terms from time to time. Continued use of Cascade
					after changes take effect constitutes acceptance of the updated Terms.
				</p>

				<h2>Contact</h2>
				<p>
					Questions about these Terms? Email us at{" "}
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
