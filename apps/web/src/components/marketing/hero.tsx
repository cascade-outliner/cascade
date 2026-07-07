import { Button } from "@cascade/ui/button";
import { ArrowRightIcon } from "@phosphor-icons/react";

export function Hero() {
	return (
		<header className="mx-auto max-w-[760px] px-8 pt-18 pb-10 text-center">
			<h1 className="mb-6 text-balance font-serif text-[68px] leading-[1.05] font-light tracking-[-0.02em]">
				A quieter place to think in lists.
			</h1>
			<p className="mx-auto mb-9 max-w-[480px] text-pretty text-lg leading-[1.6] text-graphite">
				Cascade is an infinitely nested outliner. One outline for everything
				&mdash; notes, plans, someday-maybes.
			</p>
			<div className="flex flex-col items-center gap-3.5">
				<Button
					// biome-ignore lint/a11y/useAnchorContent: content is supplied as Button's children and composed onto the anchor by Base UI's render prop
					render={<a href="https://app.cascadelist.com/" />}
					icon={<ArrowRightIcon className="size-4" weight="bold" />}
				>
					Try Cascade &mdash; it&rsquo;s free
				</Button>
				<div className="text-[13px] text-[#8f9199]">
					Free &middot; runs in your browser
				</div>
			</div>
		</header>
	);
}
