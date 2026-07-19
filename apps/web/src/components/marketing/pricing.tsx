import { Button } from "@cascade/ui/button";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { AsteriskIcon } from "@phosphor-icons/react/ssr";
import { appRegisterUrl } from "#/lib/app-url";
import { m } from "#/paraglide/messages.js";

export function Pricing() {
	return (
		<section id="pricing" className="bg-surface">
			<div className="mx-auto max-w-3xl px-8 py-24 text-center">
				<h2 className="mb-5 font-serif text-4xl md:text-6xl font-light inline-flex justify-start">
					{m.pricing_heading()}
					<AsteriskIcon size={24} weight="thin" />
				</h2>
				<p className="mx-auto mb-4 max-w-xl text-pretty text-base text-muted">
					{m.pricing_body_line1()}
					<br />
					{m.pricing_body_line2()}
				</p>
				<Button
					className="mt-6"
					nativeButton={false}
					variant="dark"
					render={<a href={appRegisterUrl} />}
					icon={<ArrowRightIcon className="size-4" weight="bold" />}
				>
					{m.pricing_cta()}
				</Button>
			</div>
		</section>
	);
}
