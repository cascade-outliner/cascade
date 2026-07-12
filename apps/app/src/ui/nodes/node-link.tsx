import { Link } from "@tanstack/react-router";
import { m } from "#/paraglide/messages.js";

interface NodeLinkProps {
	id: string;
}

export function NodeLink({ id }: NodeLinkProps) {
	return (
		<Link
			to="/node/$nodeId"
			params={{ nodeId: id }}
			viewTransition
			aria-label={m.node_link_open()}
			className="relative z-0 after:absolute after:-inset-2 w-2 h-2 rounded-full bg-dark-grey hover:bg-redleather dark:bg-ginger dark:hover:bg-redleather shrink-0 hover:scale-150 hover:-z-10 transition-all ease-in-out"
		/>
	);
}
