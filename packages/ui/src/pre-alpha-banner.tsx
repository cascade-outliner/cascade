import { WarningIcon } from "@phosphor-icons/react/ssr";

export function PreAlphaBanner() {
	return (
		<div className="bg-ginger py-2 text-center text-dark-grey text-sm">
			<div className="relative mx-auto flex max-w-3xl items-center justify-center gap-2 px-10">
				<WarningIcon size={16} weight="fill" className="text-redleather" />
				<span>
					Cascade is in <strong className="font-semibold">pre-alpha</strong> -
					expect bugs and breaking changes.
				</span>
			</div>
		</div>
	);
}
