import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Suspense } from "react";
import { splitNodeSlug } from "@/features/nodes/model/node-slug";
import { Breadcrumbs } from "@/features/nodes/ui/breadcrumbs";
import { orpc } from "@/orpc/client";
import { wayfinding } from "./app-header.styles";

/** Resolves the current node's slug to an id and hands off to the app's
 * one real breadcrumb trail — reused here instead of duplicated, and no
 * longer rendered inline on the node detail page itself (see #344). */
function ResolvedBreadcrumbs({ nodeSlug }: { nodeSlug: string }) {
	const { slugId, slugText } = splitNodeSlug(nodeSlug);
	const { data } = useSuspenseQuery(
		orpc.nodes.resolveSlug.queryOptions({ input: { slugId, slugText } }),
	);
	return <Breadcrumbs nodeId={data.id} />;
}

/** Nothing on the tree root (the logo already means "home"); the node's
 * breadcrumb trail once a node's detail page is open. */
export function HeaderWayfinding() {
	const { nodeSlug } = useParams({ strict: false });
	if (!nodeSlug) return null;

	return (
		<div className={wayfinding()}>
			<Suspense fallback={null}>
				<ResolvedBreadcrumbs nodeSlug={nodeSlug} />
			</Suspense>
		</div>
	);
}
