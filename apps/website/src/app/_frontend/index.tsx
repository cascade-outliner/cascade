import { createFileRoute, notFound } from "@tanstack/react-router";
import { NotFound } from "@/components/not-found";
import { PageView, pageHead } from "@/components/page-view";
import { HOME_SLUG } from "@/lib/site";
import { getPageBySlug } from "./page.functions";

export const Route = createFileRoute("/_frontend/")({
	component: HomePage,
	notFoundComponent: NotFound,
	loader: async ({ context }) => {
		const page = await getPageBySlug({ data: HOME_SLUG });
		if (!page) throw notFound();
		return { page, header: context.chrome.header };
	},
	head: ({ loaderData }) =>
		loaderData ? pageHead(loaderData.page, loaderData.header) : {},
});

function HomePage() {
	const { page } = Route.useLoaderData();
	return <PageView page={page} />;
}
