import { CaretDownIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import type { FaqBlock } from "@/payload-types";
import { media } from "@/theme/breakpoints.stylex";
import { site, siteFontSize, siteShadow } from "@/theme/site.stylex";
import { Heading } from "../ui/heading";
import { Section } from "../ui/section";
import { Paragraphs } from "../ui/text";

const styles = stylex.create({
	layout: {
		display: "grid",
		gridTemplateColumns: {
			default: "320px minmax(0, 1fr)",
			[media.tablet]: "minmax(0, 1fr)",
		},
		gap: { default: "3.5rem", [media.tablet]: "1.5rem" },
		alignItems: "start",
	},
	list: {
		display: "flex",
		flexDirection: "column",
		borderBottomWidth: 1,
		borderBottomStyle: "solid",
		borderBottomColor: site.rule,
	},
	item: {
		borderTopWidth: 1,
		borderTopStyle: "solid",
		borderTopColor: site.rule,
		paddingBlock: "1.25rem",
	},
	summary: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "1rem",
		listStyle: "none",
		cursor: "pointer",
		fontSize: "1.1875rem",
		fontWeight: 600,
		lineHeight: 1.4,
		borderRadius: "8px",
		outline: "none",
		boxShadow: { default: "none", ":focus-visible": siteShadow.focus },
		"::-webkit-details-marker": { display: "none" },
	},
	caret: {
		flexShrink: 0,
		color: site.muted,
		transitionProperty: "transform",
		transitionDuration: { default: "150ms", [media.reducedMotion]: "0ms" },
	},
	caretOpen: {
		transform: "rotate(180deg)",
	},
	answer: {
		marginBlockStart: "0.75rem",
		maxWidth: 620,
		display: "flex",
		flexDirection: "column",
		gap: "0.75rem",
		fontSize: siteFontSize.body,
	},
});

export function Faq({ block }: { block: FaqBlock }) {
	const headingId = useId();
	const items = block.items ?? [];

	return (
		<Section id={block.anchor} labelledBy={headingId}>
			<div {...stylex.props(styles.layout)}>
				<Heading as="h2" id={headingId}>
					{block.heading}
				</Heading>
				<div {...stylex.props(styles.list)}>
					{items.map((item, index) => (
						<details
							key={item.id ?? item.question}
							open={index === 0}
							name="faq"
							{...stylex.props(styles.item)}
						>
							<summary {...stylex.props(styles.summary)}>
								{item.question}
								<CaretDownIcon
									size={16}
									aria-hidden="true"
									{...stylex.props(styles.caret)}
								/>
							</summary>
							<div {...stylex.props(styles.answer)}>
								<Paragraphs text={item.answer} tone="muted" />
							</div>
						</details>
					))}
				</div>
			</div>
		</Section>
	);
}
