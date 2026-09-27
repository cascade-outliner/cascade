import { fonts } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { HeroBlock } from "@/payload-types";
import { media } from "@/theme/breakpoints.stylex";
import { site, siteFontSize } from "@/theme/site.stylex";
import { LiveOutline } from "../live-outline/live-outline";
import { ButtonLink } from "../ui/button-link";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Heading } from "../ui/heading";
import { Mono } from "../ui/mono";
import { Paragraphs } from "../ui/text";

const styles = stylex.create({
	hero: {
		display: "grid",
		gridTemplateColumns: {
			default: "minmax(0, 1fr) 540px",
			[media.tablet]: "minmax(0, 1fr)",
		},
		gap: { default: "4rem", [media.tablet]: "3rem" },
		alignItems: "center",
		paddingBlock: {
			default: "3.5rem 6rem",
			[media.tablet]: "1.5rem 4.5rem",
		},
	},
	copy: {
		display: "flex",
		flexDirection: "column",
		gap: "1.625rem",
	},
	body: {
		maxWidth: 480,
	},
	actions: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: "0.75rem",
	},
	outlineWrap: {
		position: "relative",
		width: "100%",
		maxWidth: { default: null, [media.tablet]: 620 },
		marginInline: { default: null, [media.tablet]: "auto" },
		marginBlockStart: { default: null, [media.tablet]: "1.5rem" },
	},
	sticker: {
		position: "absolute",
		top: -30,
		insetInlineEnd: { default: -14, [media.mobile]: 8 },
		transform: "rotate(4deg)",
		zIndex: 2,
		paddingBlock: 6,
		paddingInline: 11,
		borderRadius: "8px",
		backgroundColor: site.ink,
		color: site.onDark,
		fontFamily: fonts.mono,
		fontSize: siteFontSize.eyebrow,
		fontWeight: 500,
		whiteSpace: "nowrap",
	},
});

export function Hero({ block }: { block: HeroBlock }) {
	return (
		<Container>
			<header {...stylex.props(styles.hero)}>
				<div {...stylex.props(styles.copy)}>
					{block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
					<Heading as="h1">{block.heading}</Heading>
					<Paragraphs text={block.body} size="lead" style={styles.body} />
					<div {...stylex.props(styles.actions)}>
						<ButtonLink
							href={block.cta.url}
							newTab={block.cta.newTab}
							size="lg"
						>
							{block.cta.label}
						</ButtonLink>
						{block.note && <Mono>{block.note}</Mono>}
					</div>
				</div>
				<div {...stylex.props(styles.outlineWrap)}>
					{block.sticker && (
						<span aria-hidden="true" {...stylex.props(styles.sticker)}>
							{block.sticker}
						</span>
					)}
					<LiveOutline />
				</div>
			</header>
		</Container>
	);
}
