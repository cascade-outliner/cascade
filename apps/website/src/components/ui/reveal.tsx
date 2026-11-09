import { duration, easing } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { type ReactNode, useCallback } from "react";

const styles = stylex.create({
	reveal: {
		'[data-reveal="hidden"]': {
			opacity: 0,
			transform: "translateY(24px)",
		},
		'[data-reveal="shown"]': {
			transitionProperty: "opacity, transform",
			transitionDuration: duration["600"],
			transitionTimingFunction: easing.soft,
		},
	},
});

export const revealStyle = styles.reveal;

/**
 * Fades an element up the first time it scrolls into view. Server-rendered
 * visible; only what starts below the fold is hidden, so nothing flashes and
 * nothing depends on script to be readable.
 */
export function useReveal(delay = 0, enabled = true) {
	return useCallback(
		(element: HTMLElement | null) => {
			if (!element || !enabled) return;
			if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
			if (element.getBoundingClientRect().top < window.innerHeight) return;

			const done = (event: TransitionEvent) => {
				if (event.target !== element) return;
				element.removeEventListener("transitionend", done);
				delete element.dataset.reveal;
				element.style.transitionDelay = "";
			};
			const observer = new IntersectionObserver(
				([entry]) => {
					if (!entry?.isIntersecting) return;
					observer.disconnect();
					element.addEventListener("transitionend", done);
					element.style.transitionDelay = `${delay}ms`;
					element.dataset.reveal = "shown";
				},
				{ rootMargin: "0px 0px -8% 0px" },
			);
			element.dataset.reveal = "hidden";
			observer.observe(element);

			return () => {
				observer.disconnect();
				element.removeEventListener("transitionend", done);
				delete element.dataset.reveal;
				element.style.transitionDelay = "";
			};
		},
		[delay, enabled],
	);
}

export interface RevealProps {
	children: ReactNode;
	/** Milliseconds to wait once in view, to stagger siblings. */
	delay?: number;
	style?: stylex.StyleXStyles;
}

export function Reveal({ children, delay, style }: RevealProps) {
	const ref = useReveal(delay);
	return (
		<div ref={ref} {...stylex.props(styles.reveal, style)}>
			{children}
		</div>
	);
}
