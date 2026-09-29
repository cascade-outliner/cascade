import { createFileRoute } from "@tanstack/react-router";
import { pageUrl } from "@/components/page-view";

// Always listed, even with no pages published.
const APP_URL = "https://app.cascadelist.com/";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async () => {
				const [{ getPayload }, { default: config }] = await Promise.all([
					import("payload"),
					import("@payload-config"),
				]);
				const payload = await getPayload({ config });
				const [{ siteUrl }, { docs }] = await Promise.all([
					payload.findGlobal({ slug: "header", overrideAccess: false }),
					payload.find({
						collection: "pages",
						where: { noIndex: { not_equals: true } },
						select: { slug: true, updatedAt: true },
						pagination: false,
						overrideAccess: false,
					}),
				]);
				const urls = [`<url><loc>${APP_URL}</loc></url>`]
					.concat(
						docs.map(
							(page) =>
								`<url><loc>${pageUrl(page, siteUrl)}</loc><lastmod>${page.updatedAt}</lastmod></url>`,
						),
					)
					.join("");
				return new Response(
					`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
					{
						headers: {
							"content-type": "application/xml",
							"cache-control": "public, max-age=3600",
						},
					},
				);
			},
		},
	},
});
