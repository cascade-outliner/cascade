import { createServerFn } from "@tanstack/react-start";
import type { Footer, Header, Page } from "@/payload-types";

const getPayload = async () => {
	const [{ getPayload }, { default: config }] = await Promise.all([
		import("payload"),
		import("@payload-config"),
	]);
	return getPayload({ config });
};

export interface SiteChrome {
	header: Header;
	footer: Footer;
}

/** Header and footer globals, shared by every frontend page. */
export const getSiteChrome = createServerFn({ method: "GET" }).handler(
	async (): Promise<SiteChrome> => {
		const payload = await getPayload();
		const [header, footer] = await Promise.all([
			payload.findGlobal({ slug: "header", overrideAccess: false }),
			payload.findGlobal({ slug: "footer", overrideAccess: false }),
		]);
		return { header, footer };
	},
);

export const getPageBySlug = createServerFn({ method: "GET" })
	.validator((slug: string) => slug)
	.handler(async ({ data: slug }): Promise<Page | null> => {
		const payload = await getPayload();
		const { docs } = await payload.find({
			collection: "pages",
			where: { slug: { equals: slug } },
			limit: 1,
			pagination: false,
			overrideAccess: false,
		});
		return docs[0] ?? null;
	});
