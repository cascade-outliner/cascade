/** A node's custom emoji icon, shown in its own slot before the node text —
 * separate from the row's focus dot (#589). Renders nothing without an icon. */
export function NodeIcon({ icon }: { icon: string }) {
	return (
		<span
			aria-hidden
			className="flex h-5 w-5 shrink-0 items-center justify-center text-lg leading-none select-none"
		>
			{icon}
		</span>
	);
}
