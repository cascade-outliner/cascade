import { HOME_SLUG } from "@/lib/site";
import type { Header, Page } from "@/payload-types";
import { RenderBlocks } from "./blocks/render-blocks";

/** A CMS page: nothing but its blocks, in order. */
export function PageView({ page }: { page: Page }) {
	return <RenderBlocks layout={page.layout} />;
}

const SOCIAL_IMAGE = "/social-preview.png";

export function pageHead(page: Page, header: Header) {
	const { siteName, siteUrl } = header;
	const title =
		page.slug === HOME_SLUG
			? `${siteName} — ${page.title}`
			: `${page.title} — ${siteName}`;
	const url =
		page.slug === HOME_SLUG ? `${siteUrl}/` : `${siteUrl}/${page.slug}`;
	const imageUrl = new URL(SOCIAL_IMAGE, siteUrl).href;

	return {
		meta: [
			{ title },
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
	};
}
