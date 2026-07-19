import { CircleNotchIcon } from "@phosphor-icons/react/ssr";
import { useUiLabels } from "./labels-context";

export function CascadeLoader() {
	const labels = useUiLabels();
	return (
		<div className="flex w-screen h-screen relative z-10 items-center justify-center">
			<CircleNotchIcon
				size={48}
				className="animate-spin text-redleather dark:text-peach"
				aria-label={labels.loading}
			/>
		</div>
	);
}
