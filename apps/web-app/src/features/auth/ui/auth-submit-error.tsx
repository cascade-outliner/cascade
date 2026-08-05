import { WarningCircleIcon } from "@phosphor-icons/react/ssr";

export function AuthSubmitError({ message }: { message: string | null }) {
	if (!message) return null;
	return (
		<p
			role="alert"
			className="flex items-start gap-2 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2.5 text-sm text-danger"
		>
			<WarningCircleIcon
				className="mt-0.5 size-4 shrink-0"
				weight="bold"
				aria-hidden
			/>
			{message}
		</p>
	);
}
