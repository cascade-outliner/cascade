import { Link } from "@tanstack/react-router";
import { m } from "#/paraglide/messages.js";
import { toNodeSlug } from "./node-slug";

interface NodeLinkProps {
	id: string;
	content: unknown;
}

export function NodeLink({ id, content }: NodeLinkProps) {
	return (
		<Link
			to="/$nodeSlug"
			params={{ nodeSlug: toNodeSlug({ id, content }) }}
			search={true}
			aria-label={m.node_link_open()}
			className="relative z-0 after:absolute after:-inset-2 w-2 h-2 rounded-full bg-dark-grey hover:bg-redleather dark:bg-ginger dark:hover:bg-redleather shrink-0"
		/>
	);
}
