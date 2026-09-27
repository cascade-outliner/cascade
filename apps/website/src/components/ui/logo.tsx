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
		width: 26,
		height: 26,
		flexShrink: 0,
		borderRadius: "8px",
		backgroundColor: site.primary,
		display: "grid",
		placeItems: "center",
	},
	dot: {
		width: 7,
		height: 7,
		borderRadius: "50%",
		backgroundColor: "#ffffff",
	},
	wordmark: {
		fontSize: "1.1875rem",
		fontWeight: 700,
		letterSpacing: "-0.02em",
	},
	small: {
		width: 20,
		height: 20,
		borderRadius: "6px",
	},
	smallDot: {
		width: 6,
		height: 6,
	},
});

/** The terracotta square with a bullet: the app icon. */
export function LogoMark({ size = "md" }: { size?: "sm" | "md" }) {
	return (
		<span
			aria-hidden="true"
			{...stylex.props(styles.mark, size === "sm" && styles.small)}
		>
			<span {...stylex.props(styles.dot, size === "sm" && styles.smallDot)} />
		</span>
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
