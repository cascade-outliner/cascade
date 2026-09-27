import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import type { FeatureGridBlock } from "@/payload-types";
import { media } from "@/theme/breakpoints.stylex";
import { FeatureIllustrationView } from "../illustrations/feature-illustrations";
import { Card } from "../ui/card";
import { Heading } from "../ui/heading";
import { Section } from "../ui/section";
import { Text } from "../ui/text";

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
					<Card key={feature.id ?? feature.title} as="li" style={styles.card}>
						<FeatureIllustrationView kind={feature.illustration} />
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
