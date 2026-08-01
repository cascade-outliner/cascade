/**
 * Static, non-interactive stand-in for the "open node" marker. Consumers that
 * have a route to link to (e.g. the app) pass `renderNodeLink` to VirtualTree
 * to replace this with a real link.
 *
 * The marker is the node's emoji icon when it has one, otherwise empty;
 * either way it's hidden at rest and only the plain focus circle appears,
 * layered on top, on hover (see #557).
 */
export function DefaultNodeLink({ icon }: { icon?: string | null }) {
	return (
		<span
			aria-hidden
			className="group/node-link relative flex h-4 w-4 shrink-0 items-center justify-center"
		>
			{icon && <span className="text-sm leading-none select-none">{icon}</span>}
			<span className="absolute inset-0 m-auto h-4 w-4 rounded-full bg-white opacity-0 blur-sm transition-opacity group-hover/node-link:opacity-90" />
			<span className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-ink opacity-0 transition-opacity group-hover/node-link:opacity-100 dark:bg-surface" />
		</span>
	);
}
