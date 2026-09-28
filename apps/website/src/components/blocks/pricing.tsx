import { fonts } from "@cascade/theme/tokens.stylex";
import { CheckIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import type { PricingBlock } from "@/payload-types";
import { media } from "@/theme/breakpoints.stylex";
import { site, siteFontSize } from "@/theme/site.stylex";
import { ButtonLink } from "../ui/button-link";
import { Card } from "../ui/card";
import { Heading } from "../ui/heading";
import { Section } from "../ui/section";
import { Text } from "../ui/text";

const styles = stylex.create({
	wrap: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "2.5rem",
	},
	intro: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "0.75rem",
		textAlign: "center",
	},
	plans: {
		listStyle: "none",
		margin: 0,
		padding: 0,
		display: "grid",
		gridTemplateColumns: {
			default: "repeat(auto-fit, minmax(280px, 380px))",
			[media.mobile]: "minmax(0, 1fr)",
		},
		justifyContent: "center",
		gap: "1.125rem",
		width: "100%",
	},
	plan: {
		position: "relative",
		gap: "1.375rem",
	},
	badge: {
		position: "absolute",
		top: 24,
		insetInlineEnd: 24,
		paddingBlock: 4,
		paddingInline: 9,
		borderRadius: "6px",
		backgroundColor: site.primary,
		color: "#ffffff",
		fontFamily: fonts.mono,
		fontSize: "0.66rem",
		fontWeight: 500,
		textTransform: "uppercase",
	},
	name: {
		fontSize: siteFontSize.large,
		fontWeight: 600,
	},
	priceRow: {
		marginBlockStart: "0.625rem",
		display: "flex",
		alignItems: "baseline",
		flexWrap: "wrap",
		gap: "0.375rem",
	},
	price: {
		fontSize: siteFontSize.price,
		fontWeight: 700,
		lineHeight: 1,
	},
	period: {
		color: site.muted,
	},
	periodOnDark: {
		color: site.onDarkMuted,
	},
	features: {
		listStyle: "none",
		margin: 0,
		padding: 0,
		display: "flex",
		flexDirection: "column",
		gap: 11,
		fontSize: "0.9375rem",
	},
	feature: {
		display: "flex",
		gap: 10,
	},
	check: {
		flexShrink: 0,
		marginBlockStart: 3,
		color: site.primary,
	},
	checkOnDark: {
		color: site.accentOnDark,
	},
	cta: {
		marginBlockStart: "auto",
	},
});

export function Pricing({ block }: { block: PricingBlock }) {
	const headingId = useId();
	const plans = block.plans ?? [];

	return (
		<Section id={block.anchor} labelledBy={headingId}>
			<div {...stylex.props(styles.wrap)}>
				<div {...stylex.props(styles.intro)}>
					<Heading as="h2" id={headingId}>
						{block.heading}
					</Heading>
					{block.body && <Text tone="muted">{block.body}</Text>}
				</div>
				<ul {...stylex.props(styles.plans)}>
					{plans.map((plan) => {
						const featured = Boolean(plan.featured);
						return (
							<Card
								key={plan.id ?? plan.name}
								as="li"
								tone={featured ? "dark" : "paper"}
								padding="roomy"
								style={styles.plan}
							>
								{featured && plan.badge && (
									<span {...stylex.props(styles.badge)}>{plan.badge}</span>
								)}
								<div>
									<h3 {...stylex.props(styles.name)}>{plan.name}</h3>
									<p {...stylex.props(styles.priceRow)}>
										<span {...stylex.props(styles.price)}>{plan.price}</span>
										{plan.period && (
											<span
												{...stylex.props(
													styles.period,
													featured && styles.periodOnDark,
												)}
											>
												{plan.period}
											</span>
										)}
									</p>
								</div>
								{plan.features && plan.features.length > 0 && (
									<ul {...stylex.props(styles.features)}>
										{plan.features.map((feature) => (
											<li
												key={feature.id ?? feature.text}
												{...stylex.props(styles.feature)}
											>
												<CheckIcon
													size={16}
													aria-hidden="true"
													{...stylex.props(
														styles.check,
														featured && styles.checkOnDark,
													)}
												/>
												{feature.text}
											</li>
										))}
									</ul>
								)}
								<ButtonLink
									href={plan.cta.url}
									newTab={plan.cta.newTab}
									variant={featured ? "primary" : "outline"}
									block
									style={styles.cta}
								>
									{plan.cta.label}
								</ButtonLink>
							</Card>
						);
					})}
				</ul>
			</div>
		</Section>
	);
}
