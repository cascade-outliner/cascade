import { CheckIcon } from "@phosphor-icons/react";
import { useId } from "react";
import type { PricingBlock } from "@/payload-types";
import { css, cva } from "@/styled-system/css";
import { ButtonLink } from "../ui/button-link";
import { Card } from "../ui/card";
import { Heading } from "../ui/heading";
import { Section } from "../ui/section";
import { Text } from "../ui/text";

const styles = {
	wrap: css({
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "2.5rem",
	}),
	intro: css({
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "0.75rem",
		textAlign: "center",
	}),
	plans: css({
		listStyle: "none",
		margin: 0,
		padding: 0,
		display: "grid",
		gridTemplateColumns: {
			base: "repeat(auto-fit, minmax(280px, 380px))",
			_mobile: "minmax(0, 1fr)",
		},
		justifyContent: "center",
		gap: "1.125rem",
		width: "100%",
	}),
	plan: css.raw({
		position: "relative",
		gap: "1.375rem",
	}),
	badge: css({
		position: "absolute",
		top: "24px",
		insetInlineEnd: "24px",
		paddingBlock: "4px",
		paddingInline: "9px",
		borderRadius: "6px",
		backgroundColor: "site.primary",
		color: "#ffffff",
		fontFamily: "mono",
		fontSize: "0.66rem",
		fontWeight: 500,
		textTransform: "uppercase",
	}),
	name: css({
		fontSize: "site.large",
		fontWeight: 600,
	}),
	priceRow: css({
		marginBlockStart: "0.625rem",
		display: "flex",
		alignItems: "baseline",
		flexWrap: "wrap",
		gap: "0.375rem",
	}),
	price: css({
		fontSize: "site.price",
		fontWeight: 700,
		lineHeight: 1,
	}),
	features: css({
		listStyle: "none",
		margin: 0,
		padding: 0,
		display: "flex",
		flexDirection: "column",
		gap: "11px",
		fontSize: "0.9375rem",
	}),
	feature: css({
		display: "flex",
		gap: "10px",
	}),
	cta: css.raw({
		marginBlockStart: "auto",
	}),
};

const period = cva({
	variants: {
		onDark: {
			false: { color: "site.muted" },
			true: { color: "site.onDarkMuted" },
		},
	},
});

const check = cva({
	base: {
		flexShrink: 0,
		marginBlockStart: "3px",
	},
	variants: {
		onDark: {
			false: { color: "site.primary" },
			true: { color: "site.accentOnDark" },
		},
	},
});

export function Pricing({ block }: { block: PricingBlock }) {
	const headingId = useId();
	const plans = block.plans ?? [];

	return (
		<Section id={block.anchor} labelledBy={headingId}>
			<div className={styles.wrap}>
				<div className={styles.intro}>
					<Heading as="h2" id={headingId}>
						{block.heading}
					</Heading>
					{block.body && <Text tone="muted">{block.body}</Text>}
				</div>
				<ul className={styles.plans}>
					{plans.map((plan) => {
						const featured = Boolean(plan.featured);
						return (
							<Card
								key={plan.id ?? plan.name}
								as="li"
								tone={featured ? "dark" : "paper"}
								padding="roomy"
								css={styles.plan}
							>
								{featured && plan.badge && (
									<span className={styles.badge}>{plan.badge}</span>
								)}
								<div>
									<h3 className={styles.name}>{plan.name}</h3>
									<p className={styles.priceRow}>
										<span className={styles.price}>{plan.price}</span>
										{plan.period && (
											<span className={period({ onDark: featured })}>
												{plan.period}
											</span>
										)}
									</p>
								</div>
								{plan.features && plan.features.length > 0 && (
									<ul className={styles.features}>
										{plan.features.map((feature) => (
											<li
												key={feature.id ?? feature.text}
												className={styles.feature}
											>
												<CheckIcon
													size={16}
													aria-hidden="true"
													className={check({ onDark: featured })}
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
									css={styles.cta}
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
