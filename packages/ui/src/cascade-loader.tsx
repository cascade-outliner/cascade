import { CircleNotchIcon } from "@phosphor-icons/react/ssr";

export function CascadeLoader() {
	return (
		<div className="flex h-screen w-screen items-center justify-center">
			<CircleNotchIcon
				size={48}
				className="animate-spin text-redleather dark:text-peach"
				aria-label="Loading"
			/>
		</div>
	);
}
