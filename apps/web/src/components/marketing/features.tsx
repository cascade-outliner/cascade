import type { ReactNode } from "react";

const kbdClassName =
	"rounded-md border border-dark-grey/18 border-b-2 bg-[#fffcf9] px-2.5 py-1 font-mono text-xs text-graphite";

export function Features() {
	return (
		<section id="features" className="mx-auto max-w-[1040px] px-8 pt-8 pb-28">
			<h2 className="mb-16 text-center font-serif text-[42px] font-light tracking-[-0.02em]">
				Everything is a list.
			</h2>
			<div className="grid grid-cols-3 gap-14">
				<FeatureCard
					title="Infinite depth"
					description="Nest as deep as your thoughts go. Every item is a list of its own, all the way down."
				>
					<div className="flex h-11 flex-col justify-center gap-2">
						<div className="flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-dark-grey" />
							<span className="h-[3px] w-[72px] rounded-sm bg-[#f0dccb]" />
						</div>
						<div className="flex items-center gap-2 pl-[18px]">
							<span className="size-1.5 rounded-full bg-graphite" />
							<span className="h-[3px] w-14 rounded-sm bg-[#f0dccb]" />
						</div>
						<div className="flex items-center gap-2 pl-9">
							<span className="size-1.5 rounded-full bg-peach" />
							<span className="h-[3px] w-10 rounded-sm bg-[#f0dccb]" />
						</div>
					</div>
				</FeatureCard>
				<FeatureCard
					title="Keyboard-first"
					description="Capture, reorder, and restructure without your hands leaving the home row."
				>
					<div className="flex h-11 items-center gap-2">
						<span className={kbdClassName}>Tab</span>
						<span className={kbdClassName}>&crarr;</span>
					</div>
				</FeatureCard>
				<FeatureCard
					title="Collapse the noise"
					description="Fold away everything you’re not working on and give one branch your full attention."
				>
					<div className="flex h-11 items-center gap-3.5">
						<span className="size-1.5 rounded-full bg-[#f0dccb]" />
						<span className="size-3.5 rounded-full bg-peach" />
						<span className="size-1.5 rounded-full bg-[#f0dccb]" />
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
			<h3 className="text-[17px] font-bold">{title}</h3>
			<p className="text-pretty text-[15px] leading-[1.6] text-graphite">
				{description}
			</p>
		</div>
	);
}
