import { useId } from "react";
import type { FeatureGridBlock } from "@/payload-types";
import { css, keyframes } from "@/styled-system/css";
import { FeatureIllustrationView } from "../illustrations/feature-illustrations";
import { Card } from "../ui/card";
import { Heading } from "../ui/heading";
import { Section } from "../ui/section";
import { Text } from "../ui/text";

const pulse = keyframes({
	"0%, 100%": { opacity: "full" },
	"50%": { opacity: "dim" },
});

const styles = {
	intro: css({
		display: "flex",
		flexDirection: { base: "row", _tablet: "column" },
		alignItems: { base: "flex-end", _tablet: "flex-start" },
		justifyContent: "space-between",
		gap: { base: "site.10", _tablet: "site.4" },
		marginBlockEnd: "site.9",
	}),
	heading: css.raw({
		maxWidth: "prose.xl",
	}),
	lead: css.raw({
		maxWidth: "prose.md",
	}),
	grid: css({
		listStyle: "none",
		margin: "0",
		padding: "0",
		display: "grid",
		gridTemplateColumns: {
			base: "repeat(3, minmax(0, 1fr))",
			_tabletOnly: "repeat(2, minmax(0, 1fr))",
			_mobile: "minmax(0, 1fr)",
		},
		gap: "site.4.5",
	}),
	card: css.raw({
		gap: "site.4.5",
	}),
	// Not built yet: a dashed "blueprint" outline instead of the solid hairline.
	cardSoon: css.raw({
		boxShadow: "none",
		outlineWidth: "thick",
		outlineStyle: "dashed",
		outlineColor: "site.rule",
		outlineOffset: "[-1.5px]",
	}),
	art: css({
		position: "relative",
	}),
	artSoon: css({
		opacity: "muted",
		filter: "[grayscale(0.6)]",
	}),
	badge: css({
		position: "absolute",
		top: "2.5",
		insetInlineEnd: "2.5",
		display: "inline-flex",
		alignItems: "center",
		gap: "1.5",
		paddingBlock: "1",
		paddingInline: "[9px]",
		borderRadius: "site.control",
		backgroundColor: "site.card",
		boxShadow: "site.pop",
		color: "site.primary",
		fontFamily: "mono",
		fontSize: "site.micro",
		fontWeight: 500,
		textTransform: "uppercase",
		whiteSpace: "nowrap",
		transform: "rotate(3deg)",
	}),
	dot: css({
		width: "dot.lg",
		height: "dot.lg",
		borderRadius: "circle",
		backgroundColor: "site.primary",
		animationName: `[${pulse}]` as const,
		animationDuration: "breathe",
		animationIterationCount: "infinite",
		animationTimingFunction: "inOut",
		_motionReduce: { animationName: "[none]" },
	}),
	cardTitle: css.raw({
		marginBlockEnd: "site.1.5",
	}),
};

export function FeatureGrid({ block }: { block: FeatureGridBlock }) {
	const headingId = useId();
	const features = block.features ?? [];

	return (
		<Section id={block.anchor} labelledBy={headingId}>
			<div className={styles.intro}>
				<Heading as="h2" id={headingId} css={styles.heading}>
					{block.heading}
				</Heading>
				{block.body && (
					<Text size="body" tone="muted" css={styles.lead}>
						{block.body}
					</Text>
				)}
			</div>
			<ul className={styles.grid}>
				{features.map((feature) => (
					<Card
						key={feature.id ?? feature.title}
						as="li"
						css={css.raw(styles.card, feature.comingSoon && styles.cardSoon)}
					>
						<div className={styles.art}>
							<div className={feature.comingSoon ? styles.artSoon : undefined}>
								<FeatureIllustrationView kind={feature.illustration} />
							</div>
							{feature.comingSoon && (
								<span className={styles.badge}>
									<span aria-hidden="true" className={styles.dot} />
									Coming soon
								</span>
							)}
						</div>
						<div>
							<Heading as="h3" css={styles.cardTitle}>
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
