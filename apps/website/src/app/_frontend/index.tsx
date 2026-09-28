import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageView, pageHead } from "@/components/page-view";
import { HOME_SLUG } from "@/lib/site";
import { getPageBySlug } from "./page.functions";

export const Route = createFileRoute("/_frontend/")({
	component: HomePage,
	loader: async ({ context }) => {
		const page = await getPageBySlug({ data: HOME_SLUG });
		if (!page) throw notFound();
		return { page, siteName: context.chrome.header.siteName };
	},
	head: ({ loaderData }) =>
		loaderData ? pageHead(loaderData.page, loaderData.siteName) : {},
});

function HomePage() {
	const { page } = Route.useLoaderData();
	return <PageView page={page} />;
}
