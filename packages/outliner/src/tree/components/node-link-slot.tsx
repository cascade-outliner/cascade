/**
 * Static, non-interactive stand-in for the "open node" focus dot. Consumers
 * that have a route to link to (e.g. the app) pass `renderNodeLink` to
 * VirtualTree to replace this with a real link. Separate from the node's
 * emoji icon, which renders in its own leading slot (see the icon feature,
 * #589) rather than here (see #557).
 */
export function DefaultNodeLink() {
	return (
		<span
			aria-hidden
			className="relative flex h-5 w-5 shrink-0 items-center justify-center"
		>
			<span className="absolute inset-0 m-auto h-5 w-5 rounded-full bg-white opacity-0 transition-opacity group-hover/node:opacity-50 pointer-coarse:opacity-50" />
			<span className="absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-ink dark:bg-surface" />
		</span>
	);
}
