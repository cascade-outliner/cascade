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
 * nothing, if it has none); on hover over the row (`group/node`, set on the
 * row's own container — see RowDragAndDrop) the plain focus circle fades in
 * on top of it, indicating the click target (see #557). On touch devices
 * there's no hover, so the circle is always shown (see #586).
 */
export function NodeLink({ id, content, icon }: NodeLinkProps) {
	return (
		<Link
			viewTransition
			to="/$nodeSlug"
			params={{ nodeSlug: toNodeSlug({ id, content }) }}
			search={true}
			aria-label={m.node_link_open()}
			className="relative z-0 flex h-5 w-5 shrink-0 items-center justify-center after:absolute after:-inset-2"
		>
			{icon && (
				<span aria-hidden className="text-lg leading-none select-none">
					{icon}
				</span>
			)}
			<span
				aria-hidden
				className="absolute inset-0 m-auto h-5 w-5 rounded-full bg-white opacity-0 transition-opacity group-hover/node:opacity-50 pointer-coarse:opacity-50"
			/>
			<span
				aria-hidden
				className="absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-danger opacity-0 transition-opacity group-hover/node:opacity-100 pointer-coarse:opacity-100"
			/>
		</Link>
	);
}
