import { css } from "@/styled-system/css";
import { token } from "@/styled-system/tokens";

const styles = {
	link: css({
		display: "inline-flex",
		alignItems: "center",
		gap: "site.2.5",
		color: "site.ink",
		textDecoration: "none",
		borderRadius: "md",
		outline: "none",
		boxShadow: {
			base: "none",
			_focusVisible: "focusRing",
		},
	}),
	mark: css({
		flexShrink: 0,
	}),
	wordmark: css({
		fontSize: "site.h4",
		fontWeight: 700,
	}),
};

/** The app icon's three cascading bars, matching the web app's header mark. */
export function LogoMark({ size = "md" }: { size?: "sm" | "md" }) {
	const px = size === "sm" ? 20 : 26;
	return (
		<svg
			width={px}
			height={px}
			viewBox="0 0 24 24"
			aria-hidden="true"
			className={styles.mark}
		>
			<rect
				width={24}
				height={24}
				rx={6}
				style={{ fill: token("colors.site.primary") }}
			/>
			<g style={{ fill: token("colors.site.canvas") }}>
				<rect x={4.75} y={6.75} width={12.5} height={2} rx={1} />
				<rect x={7.25} y={11} width={9.25} height={2} rx={1} />
				<rect x={9.5} y={15.25} width={6.75} height={2} rx={1} />
			</g>
		</svg>
	);
}

export function Logo({ name }: { name: string }) {
	return (
		<a href="/" aria-label={`${name} home`} className={styles.link}>
			<LogoMark />
			<span className={styles.wordmark}>{name}</span>
		</a>
	);
}
