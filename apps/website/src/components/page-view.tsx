import { HOME_SLUG } from "@/lib/site";
import type { Header, Page } from "@/payload-types";
import { RenderBlocks } from "./blocks/render-blocks";

/** A CMS page: nothing but its blocks, in order. */
export function PageView({ page }: { page: Page }) {
	return <RenderBlocks layout={page.layout} />;
}

const SOCIAL_IMAGE = "/social-preview.png";

export function pageUrl(page: Pick<Page, "slug">, siteUrl: string) {
	return page.slug === HOME_SLUG ? `${siteUrl}/` : `${siteUrl}/${page.slug}`;
}

export function pageHead(page: Page, header: Header) {
	const { siteName, siteUrl } = header;
	const title =
		page.metaTitle ||
		(page.slug === HOME_SLUG
			? `${siteName} — ${page.title}`
			: `${page.title} — ${siteName}`);
	const url = pageUrl(page, siteUrl);
	const imageUrl = new URL(SOCIAL_IMAGE, siteUrl).href;

	return {
		meta: [
			{ title },
			...(page.noIndex ? [{ name: "robots", content: "noindex" }] : []),
			...(page.description
				? [
						{ name: "description", content: page.description },
						{ property: "og:description", content: page.description },
						{ name: "twitter:description", content: page.description },
					]
				: []),
			{ property: "og:title", content: title },
			{ property: "og:type", content: "website" },
			{ property: "og:url", content: url },
			{ property: "og:site_name", content: siteName },
			{ property: "og:locale", content: "en_US" },
			{ property: "og:image", content: imageUrl },
			{ property: "og:image:alt", content: title },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: title },
			{ name: "twitter:url", content: url },
			{ name: "twitter:image", content: imageUrl },
		],
		links: [{ rel: "canonical", href: url }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify(structuredData(page, header, url)),
			},
		],
	};
}

/** schema.org graph: the organisation, the site, the product and any FAQ on the page. */
function structuredData(page: Page, header: Header, url: string) {
	const { siteName, siteUrl } = header;
	const organization = {
		"@type": "Organization",
		"@id": `${siteUrl}/#organization`,
		name: siteName,
		url: `${siteUrl}/`,
		logo: `${siteUrl}/apple-touch-icon.png`,
	};
	const website = {
		"@type": "WebSite",
		"@id": `${siteUrl}/#website`,
		name: siteName,
		url: `${siteUrl}/`,
		publisher: { "@id": organization["@id"] },
	};
	const webPage = {
		"@type": "WebPage",
		"@id": url,
		url,
		name: page.metaTitle || page.title,
		description: page.description ?? undefined,
		isPartOf: { "@id": website["@id"] },
		dateModified: page.updatedAt,
	};

	const pricing = page.layout.find((b) => b.blockType === "pricing");
	const faq = page.layout.find((b) => b.blockType === "faq");

	const graph: Record<string, unknown>[] = [organization, website, webPage];

	if (page.slug === HOME_SLUG) {
		graph.push({
			"@type": "SoftwareApplication",
			"@id": `${siteUrl}/#app`,
			name: siteName,
			url: `${siteUrl}/`,
			description: page.description ?? undefined,
			applicationCategory: "ProductivityApplication",
			operatingSystem: "Web, macOS, iOS",
			publisher: { "@id": organization["@id"] },
			offers: pricing?.plans?.map((plan) => ({
				"@type": "Offer",
				name: plan.name,
				// ponytail: "$6" → 6; add a numeric price field if currencies ever vary
				price: plan.price.replace(/[^0-9.]/g, "") || "0",
				priceCurrency: "USD",
				description: [plan.period, ...(plan.features ?? []).map((f) => f.text)]
					.filter(Boolean)
					.join(". "),
			})),
		});
	}

	if (faq?.items?.length) {
		graph.push({
			"@type": "FAQPage",
			"@id": `${url}#faq`,
			mainEntity: faq.items.map((item) => ({
				"@type": "Question",
				name: item.question,
				acceptedAnswer: { "@type": "Answer", text: item.answer },
			})),
		});
	}

	return { "@context": "https://schema.org", "@graph": graph };
}
