import { Button } from "@cascade/ui/button";
import { ArrowRightIcon } from "@phosphor-icons/react";

export function Hero() {
	return (
		<header className="mx-auto max-w-4xl px-8 pt-24 pb-18 text-center">
			<h1 className="mb-6 text-balance font-serif text-5xl md:text-[68px] leading-[1.05] font-light tracking-[-0.02em]">
				A quieter place to think in lists.
			</h1>
			<p className="mx-auto mb-12 max-w-lg text-pretty text-lg text-graphite">
				Cascade is an infinitely nested outliner.
				<br />
				One outline for all your notes.
			</p>
			<div className="flex flex-col items-center gap-3.5">
				<Button
					// biome-ignore lint/a11y/useAnchorContent: content is supplied as Button's children and composed onto the anchor by Base UI's render prop
					render={<a href="https://app.cascadelist.com/" />}
					icon={<ArrowRightIcon className="size-4" weight="bold" />}
				>
					Try Cascade; it&rsquo;s free
				</Button>
			</div>
		</header>
	);
}
