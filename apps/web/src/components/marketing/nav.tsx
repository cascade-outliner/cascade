export function Nav() {
	return (
		<nav className="mx-auto flex max-w-[1040px] items-baseline justify-between px-8 py-7">
			<div className="font-serif text-[26px] italic tracking-[-0.01em]">
				cascade
			</div>
			<div className="flex items-baseline gap-7">
				<a
					href="#features"
					className="text-sm text-graphite hover:text-[#8e3c3e]"
				>
					Features
				</a>
				<a
					href="#pricing"
					className="text-sm text-graphite hover:text-[#8e3c3e]"
				>
					Pricing
				</a>
				<a
					href="https://app.cascadelist.com/"
					className="text-sm font-bold text-redleather hover:text-[#8e3c3e]"
				>
					Open app &rarr;
				</a>
			</div>
		</nav>
	);
}
