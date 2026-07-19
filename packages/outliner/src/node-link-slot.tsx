/**
 * Static, non-interactive stand-in for the "open node" marker. Consumers that
 * have a route to link to (e.g. the app) pass `renderNodeLink` to VirtualTree
 * to replace this with a real link.
 */
export function DefaultNodeLink() {
	return (
		<span
			aria-hidden
			className="w-2 h-2 rounded-full bg-ink dark:bg-surface shrink-0"
		/>
	);
}
