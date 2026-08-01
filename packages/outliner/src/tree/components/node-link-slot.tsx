/**
 * Static, non-interactive stand-in for the "open node" marker. Consumers that
 * have a route to link to (e.g. the app) pass `renderNodeLink` to VirtualTree
 * to replace this with a real link.
 *
 * The marker is the node's emoji icon when it has one, otherwise empty;
 * either way it's hidden at rest and only the plain focus circle appears,
 * layered on top, on hover over the row (`group/node`, set on the row's own
 * container — see RowDragAndDrop) (see #557).
 */
export function DefaultNodeLink({ icon }: { icon?: string | null }) {
	return (
		<span
			aria-hidden
			className="relative flex h-5 w-5 shrink-0 items-center justify-center"
		>
			{icon && <span className="text-lg leading-none select-none">{icon}</span>}
			<span className="absolute inset-0 m-auto h-5 w-5 rounded-full bg-white opacity-0 transition-opacity group-hover/node:opacity-50" />
			<span className="absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-ink opacity-0 transition-opacity group-hover/node:opacity-100 dark:bg-surface" />
		</span>
	);
}
