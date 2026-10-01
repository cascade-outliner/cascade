import { useId } from "react";
import type { CtaBlock } from "@/payload-types";
import { css } from "@/styled-system/css";
import { ButtonLink } from "../ui/button-link";
import { Container } from "../ui/container";
import { Heading } from "../ui/heading";
import { Text } from "../ui/text";

const styles = {
	band: css({
		backgroundColor: "site.primary",
		color: "#ffffff",
		paddingBlock: { base: "5.5rem", _mobile: "4rem" },
	}),
	inner: css.raw({
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "1.625rem",
		textAlign: "center",
	}),
	body: css.raw({
		opacity: 0.9,
		fontSize: "1.125rem",
	}),
};

export function Cta({ block }: { block: CtaBlock }) {
	const headingId = useId();

	return (
		<section aria-labelledby={headingId} className={styles.band}>
			<Container css={styles.inner}>
				<Heading as="h2" id={headingId} size="display">
					{block.heading}
				</Heading>
				{block.body && (
					<Text tone="inherit" css={styles.body}>
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
