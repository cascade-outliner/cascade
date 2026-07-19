import { WarningIcon } from "@phosphor-icons/react/ssr";
import { useUiLabels } from "./labels-context";

export function PreAlphaBanner() {
	const labels = useUiLabels();
	return (
		<div className="bg-surface py-2 text-center text-ink text-sm">
			<div className="relative mx-auto flex max-w-3xl items-center justify-center gap-2 px-10">
				<WarningIcon size={16} weight="fill" className="text-danger" />
				<span>
					{labels.preAlphaBannerPrefix}{" "}
					<strong className="font-semibold">
						{labels.preAlphaBannerEmphasis}
					</strong>{" "}
					{labels.preAlphaBannerSuffix}
				</span>
			</div>
		</div>
	);
}
