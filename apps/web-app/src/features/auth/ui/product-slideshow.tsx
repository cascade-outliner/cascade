import { useEffect, useRef, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { usePrefersReducedMotion } from "@/features/auth/model/use-prefers-reduced-motion";
import { PhoneMockup } from "@/features/auth/ui/phone-mockup";

interface Slide {
	src: string;
	alt: string;
	heading: string;
	body: string;
}

function useSlides(): Slide[] {
	return [
		{
			src: "/auth/product-tree.webp",
			alt: m.auth_showcase_tree_alt(),
			heading: m.auth_showcase_tree_heading(),
			body: m.auth_showcase_tree_body(),
		},
		{
			src: "/auth/product-filters.webp",
			alt: m.auth_showcase_filters_alt(),
			heading: m.auth_showcase_filters_heading(),
			body: m.auth_showcase_filters_body(),
		},
		{
			src: "/auth/product-search.webp",
			alt: m.auth_showcase_search_alt(),
			heading: m.auth_showcase_search_heading(),
			body: m.auth_showcase_search_body(),
		},
	];
}

const AUTO_ADVANCE_MS = 5000;

export function ProductSlideshow() {
	const slides = useSlides();
	const [index, setIndex] = useState(0);
	const [paused, setPaused] = useState(false);
	const reducedMotion = usePrefersReducedMotion();
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	// `index` is an intentional extra dependency: a manual dot click should
	// restart the auto-advance countdown, not just let the pending one fire.
	// biome-ignore lint/correctness/useExhaustiveDependencies: see above
	useEffect(() => {
		if (paused || reducedMotion) return;
		timeoutRef.current = setTimeout(() => {
			setIndex((current) => (current + 1) % slides.length);
		}, AUTO_ADVANCE_MS);
		return () => clearTimeout(timeoutRef.current);
	}, [index, paused, reducedMotion, slides.length]);

	const slide = slides[index];
	if (!slide) return null;

	return (
		<section
			aria-label={m.auth_showcase_region_label()}
			className="flex h-full flex-col items-center justify-center gap-8 px-12 py-16"
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
			onFocus={() => setPaused(true)}
			onBlur={() => setPaused(false)}
		>
			<div className="relative">
				{slides.map((item, itemIndex) => (
					<div
						key={item.src}
						className={`${
							itemIndex === index
								? "relative opacity-100"
								: "pointer-events-none absolute inset-0 opacity-0"
						} transition-opacity duration-medium-enter ease-standard motion-reduce:transition-none`}
						aria-hidden={itemIndex !== index}
					>
						<PhoneMockup src={item.src} alt={item.alt} />
					</div>
				))}
			</div>
			<div className="max-w-xs text-center" aria-live="polite">
				<h2 className="mb-2 font-serif text-2xl italic">{slide.heading}</h2>
				<p className="text-sm text-muted">{slide.body}</p>
			</div>
			<div className="flex gap-2">
				{slides.map((item, itemIndex) => (
					<button
						key={item.src}
						type="button"
						onClick={() => setIndex(itemIndex)}
						aria-label={m.auth_showcase_dot_label({ number: itemIndex + 1 })}
						aria-current={itemIndex === index}
						className={`h-1.5 rounded-full transition-[width,background-color] duration-small-enter ${
							itemIndex === index
								? "w-6 bg-ink"
								: "w-1.5 bg-ink/40 dark:bg-surface/40"
						}`}
					/>
				))}
			</div>
		</section>
	);
}
