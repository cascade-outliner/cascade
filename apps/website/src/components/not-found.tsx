import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import { ButtonLink } from "./ui/button-link";
import { Eyebrow } from "./ui/eyebrow";
import { Heading } from "./ui/heading";
import { Section } from "./ui/section";
import { Text } from "./ui/text";

const styles = stylex.create({
	layout: {
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-start",
		gap: "1.25rem",
		maxWidth: 560,
		paddingBlock: "3rem",
	},
});

/** Branded 404 for unknown slugs, rendered inside the site header and footer. */
export function NotFound() {
	const headingId = useId();
	return (
		<Section labelledBy={headingId}>
			<div {...stylex.props(styles.layout)}>
				<Eyebrow>404</Eyebrow>
				<Heading as="h1" id={headingId}>
					That bullet doesn't exist.
				</Heading>
				<Text size="lead" tone="muted">
					The page may have moved, or the link had a typo. Everything worth
					reading is one level up.
				</Text>
				<ButtonLink href="/" size="lg">
					Back to the home page
				</ButtonLink>
			</div>
		</Section>
	);
}
