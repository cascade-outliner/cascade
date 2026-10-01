import { useId } from "react";
import type { FeatureGridBlock } from "@/payload-types";
import { css, keyframes } from "@/styled-system/css";
import { FeatureIllustrationView } from "../illustrations/feature-illustrations";
import { Card } from "../ui/card";
import { Heading } from "../ui/heading";
import { Section } from "../ui/section";
import { Text } from "../ui/text";

const pulse = keyframes({
	"0%, 100%": { opacity: 1 },
	"50%": { opacity: 0.3 },
});

const styles = {
	intro: css({
		display: "flex",
		flexDirection: { base: "row", _tablet: "column" },
		alignItems: { base: "flex-end", _tablet: "flex-start" },
		justifyContent: "space-between",
		gap: { base: "2.5rem", _tablet: "1rem" },
		marginBlockEnd: "2.25rem",
	}),
	heading: css.raw({
		maxWidth: "620px",
	}),
	lead: css.raw({
		maxWidth: "360px",
	}),
	grid: css({
		listStyle: "none",
		margin: 0,
		padding: 0,
		display: "grid",
		gridTemplateColumns: {
			base: "repeat(3, minmax(0, 1fr))",
			_tabletOnly: "repeat(2, minmax(0, 1fr))",
			_mobile: "minmax(0, 1fr)",
		},
		gap: "1.125rem",
	}),
	card: css.raw({
		gap: "1.125rem",
	}),
	// Not built yet: a dashed "blueprint" outline instead of the solid hairline.
	cardSoon: css.raw({
		boxShadow: "none",
		outlineWidth: "1.5px",
		outlineStyle: "dashed",
		outlineColor: "site.rule",
		outlineOffset: "-1.5px",
	}),
	art: css({
		position: "relative",
	}),
	artSoon: css({
		opacity: 0.55,
		filter: "grayscale(0.6)",
	}),
	badge: css({
		position: "absolute",
		top: "10px",
		insetInlineEnd: "10px",
		display: "inline-flex",
		alignItems: "center",
		gap: "6px",
		paddingBlock: "4px",
		paddingInline: "9px",
		borderRadius: "6px",
		backgroundColor: "site.card",
		boxShadow: "site.pop",
		color: "site.primary",
		fontFamily: "mono",
		fontSize: "0.66rem",
		fontWeight: 500,
		textTransform: "uppercase",
		whiteSpace: "nowrap",
		transform: "rotate(3deg)",
	}),
	dot: css({
		width: "6px",
		height: "6px",
		borderRadius: "50%",
		backgroundColor: "site.primary",
		animationName: pulse,
		animationDuration: "1.8s",
		animationIterationCount: "infinite",
		animationTimingFunction: "ease-in-out",
		_motionReduce: { animationName: "none" },
	}),
	cardTitle: css.raw({
		marginBlockEnd: "0.375rem",
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
