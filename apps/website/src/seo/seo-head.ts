import { SITE_OG_IMAGE_URL, SITE_URL } from "#/config/site";

export function seoHead(title: string, description: string, path = "") {
	const url = `${SITE_URL}${path}`;
	return {
		meta: [
			{ title },
			{ name: "description", content: description },
			{ property: "og:title", content: title },
			{ property: "og:description", content: description },
			{ property: "og:url", content: url },
			{ property: "og:image", content: SITE_OG_IMAGE_URL },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ name: "twitter:title", content: title },
			{ name: "twitter:description", content: description },
			{ name: "twitter:image", content: SITE_OG_IMAGE_URL },
		],
		links: [{ rel: "canonical", href: url }],
	};
}
