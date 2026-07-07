import { Button } from "@cascade/ui/button";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { HeartIcon } from "@phosphor-icons/react/ssr";

export function Footer() {
	return (
		<footer className="mx-auto max-w-3xl px-8 pt-6 pb-12 text-center">
			<h2 className="mb-16 font-serif text-4xl md:text-6xl font-light italic">
				One list to rule them all.
			</h2>
			<div className="flex justify-center">
				<Button
					nativeButton={false}
					// biome-ignore lint/a11y/useAnchorContent: content is supplied as Button's children and composed onto the anchor by Base UI's render prop
					render={<a href="https://app.cascadelist.com/" />}
					icon={<ArrowRightIcon className="size-4" weight="bold" />}
				>
					Try Cascade &mdash; it&rsquo;s free
				</Button>
			</div>
			<div className="mt-18 flex justify-between border-t border-dark-grey/8 pt-6 text-base ">
				<span className="font-serif text-base italic">cascade</span>
				<div className="inline-flex items-center gap-0.75">
					<span>with</span>
					<HeartIcon className="fill-redleather" weight="fill" />
					<span>from</span>
					<a
						href="https://patrickroelofs.com"
						className="hover:underline focus:underline"
					>
						Patrick Roelofs
					</a>
				</div>
			</div>
		</footer>
	);
}
