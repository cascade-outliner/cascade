import { Button } from "@cascade/ui/button";
import { ArrowRightIcon } from "@phosphor-icons/react";

export function FooterCta() {
	return (
		<footer className="mx-auto max-w-[760px] px-8 pt-6 pb-12 text-center">
			<h2 className="mb-8 font-serif text-[52px] font-light italic tracking-[-0.02em]">
				Begin at the top.
			</h2>
			<div className="flex justify-center">
				<Button
					// biome-ignore lint/a11y/useAnchorContent: content is supplied as Button's children and composed onto the anchor by Base UI's render prop
					render={<a href="https://app.cascadelist.com/" />}
					icon={<ArrowRightIcon className="size-4" weight="bold" />}
				>
					Try Cascade &mdash; it&rsquo;s free
				</Button>
			</div>
			<div className="mt-18 flex justify-between border-t border-dark-grey/8 pt-6 text-[13px] text-[#8f9199]">
				<span className="font-serif text-[15px] italic">cascade</span>
				<span>&copy; 2026</span>
			</div>
		</footer>
	);
}
