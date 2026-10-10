import { fonts } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import type { FeatureGridBlock } from "@/payload-types";
import { media } from "@/theme/breakpoints.stylex";
import { site, siteShadow } from "@/theme/site.stylex";
import { FeatureIllustrationView } from "../illustrations/feature-illustrations";
import { Card } from "../ui/card";
import { Heading } from "../ui/heading";
import { Section } from "../ui/section";
import { Text } from "../ui/text";

const pulse = stylex.keyframes({
	"0%, 100%": { opacity: 1 },
	"50%": { opacity: 0.3 },
});

const styles = stylex.create({
	intro: {
		display: "flex",
		flexDirection: { default: "row", [media.tablet]: "column" },
		alignItems: { default: "flex-end", [media.tablet]: "flex-start" },
		justifyContent: "space-between",
		gap: { default: "2.5rem", [media.tablet]: "1rem" },
		marginBlockEnd: "2.25rem",
	},
	heading: {
		maxWidth: 620,
	},
	lead: {
		maxWidth: 360,
	},
	grid: {
		listStyle: "none",
		margin: 0,
		padding: 0,
		display: "grid",
		gridTemplateColumns: {
			default: "repeat(3, minmax(0, 1fr))",
			[media.tabletOnly]: "repeat(2, minmax(0, 1fr))",
			[media.mobile]: "minmax(0, 1fr)",
		},
		gap: "1.125rem",
	},
	card: {
		gap: "1.125rem",
	},
	// Not built yet: a dashed "blueprint" outline instead of the solid hairline.
	cardSoon: {
		boxShadow: "none",
		outlineWidth: 1.5,
		outlineStyle: "dashed",
		outlineColor: site.rule,
		outlineOffset: -1.5,
	},
	art: {
		position: "relative",
	},
	artSoon: {
		opacity: 0.55,
		filter: "grayscale(0.6)",
	},
	badge: {
		position: "absolute",
		top: 10,
		insetInlineEnd: 10,
		display: "inline-flex",
		alignItems: "center",
		gap: 6,
		paddingBlock: 4,
		paddingInline: 9,
		borderRadius: "6px",
		backgroundColor: site.card,
		boxShadow: siteShadow.pop,
		color: site.primary,
		fontFamily: fonts.mono,
		fontSize: "0.66rem",
		fontWeight: 500,
		textTransform: "uppercase",
		whiteSpace: "nowrap",
		transform: "rotate(3deg)",
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: "50%",
		backgroundColor: site.primary,
		animationName: pulse,
		animationDuration: "1.8s",
		animationIterationCount: "infinite",
		animationTimingFunction: "ease-in-out",
		[media.reducedMotion]: { animationName: "none" },
	},
	cardTitle: {
		marginBlockEnd: "0.375rem",
	},
});

export function FeatureGrid({ block }: { block: FeatureGridBlock }) {
	const headingId = useId();
	const features = block.features ?? [];

	return (
		<Section id={block.anchor} labelledBy={headingId}>
			<div {...stylex.props(styles.intro)}>
				<Heading as="h2" id={headingId} style={styles.heading}>
					{block.heading}
				</Heading>
				{block.body && (
					<Text size="body" tone="muted" style={styles.lead}>
						{block.body}
					</Text>
				)}
			</div>
			<ul {...stylex.props(styles.grid)}>
				{features.map((feature) => (
					<Card
						key={feature.id ?? feature.title}
						as="li"
						style={[styles.card, feature.comingSoon && styles.cardSoon]}
					>
						<div {...stylex.props(styles.art)}>
							<div {...stylex.props(feature.comingSoon && styles.artSoon)}>
								<FeatureIllustrationView kind={feature.illustration} />
							</div>
							{feature.comingSoon && (
								<span {...stylex.props(styles.badge)}>
									<span aria-hidden="true" {...stylex.props(styles.dot)} />
									Coming soon
								</span>
							)}
						</div>
						<div>
							<Heading as="h3" style={styles.cardTitle}>
								{feature.title}
							</Heading>
							<Text size="small" tone="muted">
								{feature.description}
							</Text>
						</div>
					</Card>
				))}
			</ul>
		</Section>
	);
}
