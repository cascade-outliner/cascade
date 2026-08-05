interface PhoneMockupProps {
	src: string;
	alt: string;
}

export function PhoneMockup({ src, alt }: PhoneMockupProps) {
	return (
		<div className="relative w-56 rounded-[2.75rem] bg-ink p-2.5 shadow-2xl ring-1 ring-ink/10 sm:w-64">
			<div className="relative overflow-hidden rounded-[2.125rem] bg-canvas">
				<div className="aspect-[390/760] w-full overflow-hidden">
					<img
						src={src}
						alt={alt}
						className="h-full w-full object-cover object-top"
						loading="eager"
					/>
				</div>
			</div>
		</div>
	);
}
