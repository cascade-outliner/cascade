import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import type { CtaBlock } from "@/payload-types";
import { media } from "@/theme/breakpoints.stylex";
import { site } from "@/theme/site.stylex";
import { ButtonLink } from "../ui/button-link";
import { Container } from "../ui/container";
import { Heading } from "../ui/heading";
import { Text } from "../ui/text";

const styles = stylex.create({
	band: {
		backgroundColor: site.primary,
		color: "#ffffff",
		paddingBlock: { default: "5.5rem", [media.mobile]: "4rem" },
	},
	inner: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "1.625rem",
		textAlign: "center",
	},
	body: {
		opacity: 0.9,
		fontSize: "1.125rem",
	},
});

export function Cta({ block }: { block: CtaBlock }) {
	const headingId = useId();

	return (
		<section aria-labelledby={headingId} {...stylex.props(styles.band)}>
			<Container style={styles.inner}>
				<Heading as="h2" id={headingId} size="display">
					{block.heading}
				</Heading>
				{block.body && (
					<Text tone="inherit" style={styles.body}>
						{block.body}
					</Text>
				)}
				<ButtonLink
					href={block.cta.url}
					newTab={block.cta.newTab}
					variant="light"
					size="lg"
				>
					{block.cta.label}
				</ButtonLink>
			</Container>
		</section>
	);
}
