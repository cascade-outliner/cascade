import { WarningIcon, XIcon } from "@phosphor-icons/react/ssr";

export interface PreAlphaBannerProps {
	onDismiss?: () => void;
}

export function PreAlphaBanner({ onDismiss }: PreAlphaBannerProps) {
	return (
		<div className="bg-ginger py-2 text-center text-dark-grey text-sm fixed top-0 w-full z-50">
			<div className="relative mx-auto flex max-w-3xl items-center justify-center gap-2 px-10">
				<WarningIcon size={16} weight="fill" className="text-redleather" />
				<span>
					Cascade is in <strong className="font-semibold">pre-alpha</strong> —
					expect bugs and breaking changes.
				</span>
				{onDismiss && (
					<button
						type="button"
						onClick={onDismiss}
						aria-label="Dismiss"
						className="absolute left-2 cursor-pointer rounded p-1 outline-none hover:bg-dark-grey/10 sm:right-2 sm:left-auto"
					>
						<XIcon size={16} />
					</button>
				)}
			</div>
		</div>
	);
}
