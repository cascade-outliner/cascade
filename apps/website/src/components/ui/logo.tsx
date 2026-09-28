import * as stylex from "@stylexjs/stylex";
import { site } from "@/theme/site.stylex";

const styles = stylex.create({
	link: {
		display: "inline-flex",
		alignItems: "center",
		gap: "0.625rem",
		color: site.ink,
		textDecoration: "none",
		borderRadius: "8px",
		outline: "none",
		boxShadow: {
			default: "none",
			":focus-visible": `0 0 0 3px ${site.primaryTintStrong}`,
		},
	},
	mark: {
		flexShrink: 0,
	},
	wordmark: {
		fontSize: "1.1875rem",
		fontWeight: 700,
	},
});

/** The app icon's three cascading bars, matching the web app's header mark. */
export function LogoMark({ size = "md" }: { size?: "sm" | "md" }) {
	const px = size === "sm" ? 20 : 26;
	return (
		<svg
			width={px}
			height={px}
			viewBox="0 0 24 24"
			aria-hidden="true"
			{...stylex.props(styles.mark)}
		>
			<rect width={24} height={24} rx={6} style={{ fill: site.primary }} />
			<g style={{ fill: site.canvas }}>
				<rect x={4.75} y={6.75} width={12.5} height={2} rx={1} />
				<rect x={7.25} y={11} width={9.25} height={2} rx={1} />
				<rect x={9.5} y={15.25} width={6.75} height={2} rx={1} />
			</g>
		</svg>
	);
}

export function Logo({ name }: { name: string }) {
	return (
		<a href="/" aria-label={`${name} home`} {...stylex.props(styles.link)}>
			<LogoMark />
			<span {...stylex.props(styles.wordmark)}>{name}</span>
		</a>
	);
}
