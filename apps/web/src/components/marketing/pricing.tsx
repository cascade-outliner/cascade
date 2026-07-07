import { Button } from "@cascade/ui/button";
import { ArrowRightIcon } from "@phosphor-icons/react";

export function Pricing() {
	return (
		<section id="pricing" className="bg-ginger">
			<div className="mx-auto max-w-[640px] px-8 py-24 text-center">
				<h2 className="mb-5 font-serif text-[72px] font-light tracking-[-0.02em]">
					Free.
				</h2>
				<p className="mx-auto mb-4 max-w-[420px] text-pretty text-[17px] leading-[1.6] text-graphite">
					Cascade is in development, and free to use while we build it. No
					tiers, no trials, no credit card &mdash; just a list, waiting.
				</p>
				<p className="mx-auto mb-9 max-w-[420px] text-pretty text-sm leading-[1.6] text-graphite">
					A premium plan may come later, but Cascade will always have a generous
					free plan.
				</p>
				<Button
					variant="dark"
					// biome-ignore lint/a11y/useAnchorContent: content is supplied as Button's children and composed onto the anchor by Base UI's render prop
					render={<a href="https://app.cascadelist.com/" />}
					icon={<ArrowRightIcon className="size-4" weight="bold" />}
				>
					Open Cascade
				</Button>
			</div>
		</section>
	);
}
