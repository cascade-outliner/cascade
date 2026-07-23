import { SITE_NAME } from "#/config/site";
import { m } from "#/paraglide/messages.js";
import { seoHead } from "#/seo/seo-head";
import appCss from "../styles.css?url";

const homeHead = seoHead(m.home_seo_title(), m.home_seo_description());

export function createRootHead() {
	return {
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: SITE_NAME },
			{ name: "twitter:card", content: "summary_large_image" },
			...homeHead.meta,
		],
		scripts: import.meta.env.PROD
			? [
					{
						defer: true,
						src: "https://rybbit.patrickroelofs.com/api/script.js",
						"data-site-id": "15be8ae7c0e2",
					},
				]
			: [],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			...homeHead.links,
		],
	};
}
