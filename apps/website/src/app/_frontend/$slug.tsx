import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { PageView, pageHead } from "@/components/page-view";
import { HOME_SLUG } from "@/lib/site";
import { getPageBySlug } from "./page.functions";

export const Route = createFileRoute("/_frontend/$slug")({
	component: SlugPage,
	loader: async ({ context, params }) => {
		if (params.slug === HOME_SLUG) throw redirect({ to: "/" });
		const page = await getPageBySlug({ data: params.slug });
		if (!page) throw notFound();
		return { page, header: context.chrome.header };
	},
	head: ({ loaderData }) =>
		loaderData ? pageHead(loaderData.page, loaderData.header) : {},
});

function SlugPage() {
	const { page } = Route.useLoaderData();
	return <PageView page={page} />;
}
