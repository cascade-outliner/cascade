import { lexicalToPlainText } from "@cascade/outliner/lexical-content";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { m } from "#/paraglide/messages.js";
import { splitNodeSlug } from "@/features/nodes/model/node-slug";
import { orpc } from "@/orpc/client";
import { wayfinding } from "./app-header.styles";

/** "Home" everywhere; "Home › <node title>" on a node's detail page. Reads
 * from the same cached queries the detail route's own loader already
 * populated (`orpc.nodes.resolveSlug`/`orpc.nodes.get`), so this never
 * issues an extra request in the common case. */
export function HeaderWayfinding() {
	const { nodeSlug } = useParams({ strict: false });
	const split = nodeSlug ? splitNodeSlug(nodeSlug) : null;

	const resolved = useQuery({
		...orpc.nodes.resolveSlug.queryOptions({
			input: { slugId: split?.slugId ?? "", slugText: split?.slugText ?? null },
		}),
		enabled: split !== null,
	});
	const nodeId = resolved.data?.id;

	const node = useQuery({
		...orpc.nodes.get.queryOptions({ input: { id: nodeId ?? "" } }),
		enabled: !!nodeId,
	});

	const currentTitle = nodeId
		? lexicalToPlainText(node.data?.content) || m.breadcrumbs_untitled()
		: null;

	return (
		<nav aria-label={m.breadcrumbs_nav_label()} className={wayfinding()}>
			<Link viewTransition to="/" className="shrink-0 hover:text-danger">
				{m.breadcrumbs_home_label()}
			</Link>
			{currentTitle && (
				<>
					<span aria-hidden="true" className="opacity-50">
						›
					</span>
					<span className="truncate">{currentTitle}</span>
				</>
			)}
		</nav>
	);
}
