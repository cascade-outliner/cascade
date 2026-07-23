import { Button } from "@cascade/ui/button";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { externalAppUrls } from "#/config/external-app";
import { m } from "#/paraglide/messages.js";
import { InteractiveDemoTree } from "../demo/components/interactive-demo-tree";

export function HeroSection() {
	return (
		<header className="mx-auto max-w-4xl px-8 pt-24 pb-18 text-center">
			<h1 className="mb-6 text-balance font-serif text-5xl md:text-[68px] leading-[1.05] font-light tracking-[-0.02em]">
				{m.hero_heading()}
			</h1>
			<p className="mx-auto mb-12 max-w-lg text-pretty text-lg text-muted">
				{m.hero_subtitle_line1()}
				<br />
				{m.hero_subtitle_line2()}
			</p>
			<div className="flex flex-col items-center gap-3.5">
				<Button
					nativeButton={false}
					render={<a href={externalAppUrls.register} />}
					icon={<ArrowRightIcon className="size-4" weight="bold" />}
				>
					{m.hero_cta()}
				</Button>
				<p className="text-sm text-muted">{m.hero_demo_hint()}</p>
			</div>
			<InteractiveDemoTree />
		</header>
	);
}
