import { Link } from "@tanstack/react-router";
import { m } from "#/paraglide/messages.js";
import { toNodeSlug } from "../model/node-slug";

interface NodeLinkProps {
	id: string;
	content: unknown;
}

/**
 * The row's focus dot — a small fixed "open node" click target, separate
 * from the node's optional emoji icon (rendered by the icon feature's
 * leading slot instead, see #557/#589).
 */
export function NodeLink({ id, content }: NodeLinkProps) {
	return (
		<Link
			viewTransition
			to="/$nodeSlug"
			params={{ nodeSlug: toNodeSlug({ id, content }) }}
			search={true}
			aria-label={m.node_link_open()}
			className="relative z-0 flex h-5 w-5 shrink-0 items-center justify-center after:absolute after:-inset-2"
		>
			<span
				aria-hidden
				className="absolute inset-0 m-auto h-5 w-5 rounded-full bg-white opacity-0 transition-opacity group-hover/node:opacity-50 pointer-coarse:opacity-50"
			/>
			<span
				aria-hidden
				className="absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-ink dark:bg-surface"
			/>
		</Link>
	);
}
