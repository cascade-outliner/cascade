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
		color: "site.onPrimary",
		paddingBlock: { base: "site.22", _mobile: "site.16" },
	}),
	inner: css.raw({
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "site.6.5",
		textAlign: "center",
	}),
	body: css.raw({
		opacity: "strong",
		fontSize: "site.lead",
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
