import { toNodeSlug } from "@cascade/api/node-slug";
import { Link } from "@tanstack/react-router";
import { m } from "#/paraglide/messages.js";

interface NodeLinkProps {
	id: string;
	content: unknown;
}

export function NodeLink({ id, content }: NodeLinkProps) {
	return (
		<Link
			viewTransition
			to="/$nodeSlug"
			params={{ nodeSlug: toNodeSlug({ id, content }) }}
			search={true}
			aria-label={m.node_link_open()}
			className="relative z-0 after:absolute after:-inset-2 w-2 h-2 rounded-full bg-ink hover:bg-danger dark:bg-surface dark:hover:bg-danger shrink-0"
		/>
	);
}
