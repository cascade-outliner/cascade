import { WavesIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";

const kbdClassName =
	"rounded-md border border-dark-grey/18 border-b-2 bg-[#fffcf9] px-2.5 py-1 font-mono text-xs";

export function Features() {
	return (
		<section id="features" className="mx-auto max-w-6xl px-8 pt-8 pb-48">
			<div className="flex flex-col items-center pb-4">
				<WavesIcon className="fill-redleather" size={64} weight="thin" />
			</div>
			<h2 className="mb-16 text-center font-serif text-4xl md:text-5xl font-light">
				Everything is a list.
			</h2>
			<div className="grid md:grid-cols-3 gap-14">
				<FeatureCard
					title="Infinite depth"
					description="Nest as deep as your thoughts go. Every item is a list of its own, all the way down."
				>
					<div className="flex h-12 flex-col justify-center gap-2">
						<div className="flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-dark-grey" />
							<span className="h-0.75 w-18 rounded-sm bg-ginger" />
						</div>
						<div className="flex items-center gap-2 pl-4.5">
							<span className="size-1.5 rounded-full bg-graphite" />
							<span className="h-0.75 w-14 rounded-sm bg-ginger" />
						</div>
						<div className="flex items-center gap-2 pl-9">
							<span className="size-1.5 rounded-full bg-peach" />
							<span className="h-0.75 w-10 rounded-sm bg-ginger" />
						</div>
					</div>
				</FeatureCard>
				<FeatureCard
					title="Collapse the noise"
					description="Fold away everything you’re not working on and give one branch your full attention."
				>
					<div className="flex h-12 items-center gap-3.5">
						<span className="size-1.5 rounded-full bg-ginger" />
						<span className="size-3.5 rounded-full bg-peach" />
						<span className="size-1.5 rounded-full bg-ginger" />
					</div>
				</FeatureCard>
				<FeatureCard
					title="Keyboard-first"
					description="Capture, reorder, and restructure without your hands leaving the home row."
				>
					<div className="flex h-12 items-center gap-2">
						<span className={kbdClassName}>Tab</span>
						<span className={kbdClassName}>&crarr;</span>
					</div>
				</FeatureCard>
			</div>
		</section>
	);
}

function FeatureCard({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-4">
			{children}
			<h3 className="text-lg font-bold">{title}</h3>
			<p className="text-pretty text-base">{description}</p>
		</div>
	);
}
