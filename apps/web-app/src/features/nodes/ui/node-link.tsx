import { Link } from "@tanstack/react-router";
import { m } from "#/paraglide/messages.js";
import { toNodeSlug } from "../model/node-slug";

interface NodeLinkProps {
	id: string;
	content: unknown;
	icon?: string | null;
}

/**
 * The row's "open node" marker. At rest it shows the node's emoji icon (or
 * nothing, if it has none); on hover the plain focus circle fades in on top
 * of it, indicating the click target (see #557).
 */
export function NodeLink({ id, content, icon }: NodeLinkProps) {
	return (
		<Link
			viewTransition
			to="/$nodeSlug"
			params={{ nodeSlug: toNodeSlug({ id, content }) }}
			search={true}
			aria-label={m.node_link_open()}
			className="group/node-link relative z-0 flex h-4 w-4 shrink-0 items-center justify-center after:absolute after:-inset-2"
		>
			{icon && (
				<span aria-hidden className="text-sm leading-none select-none">
					{icon}
				</span>
			)}
			<span
				aria-hidden
				className="absolute inset-0 m-auto h-3.5 w-3.5 rounded-full bg-danger opacity-0 blur-sm transition-opacity group-hover/node-link:opacity-40"
			/>
			<span
				aria-hidden
				className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-danger opacity-0 transition-opacity group-hover/node-link:opacity-100"
			/>
		</Link>
	);
}
