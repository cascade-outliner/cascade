import { HOME_SLUG } from "@/lib/site";
import type { Page } from "@/payload-types";
import { RenderBlocks } from "./blocks/render-blocks";

/** A CMS page: nothing but its blocks, in order. */
export function PageView({ page }: { page: Page }) {
	return <RenderBlocks layout={page.layout} />;
}

export function pageHead(page: Page, siteName: string) {
	const title =
		page.slug === HOME_SLUG
			? `${siteName} — ${page.title}`
			: `${page.title} — ${siteName}`;
	return {
		meta: [
			{ title },
			...(page.description
				? [
						{ name: "description", content: page.description },
						{ property: "og:description", content: page.description },
					]
				: []),
			{ property: "og:title", content: title },
			{ property: "og:type", content: "website" },
		],
	};
}
