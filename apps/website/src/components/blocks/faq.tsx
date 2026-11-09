import { duration, easing } from "@cascade/theme/tokens.stylex";
import { CaretDownIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useId, useState } from "react";
import type { FaqBlock } from "@/payload-types";
import { media } from "@/theme/breakpoints.stylex";
import { site, siteFontSize, siteShadow } from "@/theme/site.stylex";
import { Heading } from "../ui/heading";
import { Reveal } from "../ui/reveal";
import { Section } from "../ui/section";
import { Paragraphs } from "../ui/text";

const SIZABLE = "@supports (interpolate-size: allow-keywords)";

const unfold = stylex.keyframes({
	from: { opacity: 0, transform: "translateY(-6px)" },
});

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
		interpolateSize: "allow-keywords",
		"::details-content": {
			blockSize: { default: null, [SIZABLE]: 0 },
			overflow: { default: null, [SIZABLE]: "clip" },
			transitionProperty: "block-size, content-visibility",
			transitionDuration: duration["300"],
			transitionTimingFunction: easing.soft,
			transitionBehavior: "allow-discrete",
		},
	},
	itemOpen: {
		"::details-content": {
			blockSize: { default: null, [SIZABLE]: "auto" },
		},
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
		transitionDuration: duration["300"],
		transitionTimingFunction: easing.pop,
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
	answerOpen: {
		animationName: { default: unfold, [media.reducedMotion]: "none" },
		animationDuration: duration["300"],
		animationTimingFunction: easing.soft,
	},
});

type FaqItemData = NonNullable<FaqBlock["items"]>[number];

function FaqItem({
	item,
	initiallyOpen,
}: {
	item: FaqItemData;
	initiallyOpen: boolean;
}) {
	const [open, setOpen] = useState(initiallyOpen);
	// Only answers opened by hand unfold; the one open on load is just there.
	const [toggled, setToggled] = useState(false);

	return (
		<details
			open={open}
			name="faq"
			onToggle={(event) => {
				const next = event.currentTarget.open;
				if (next !== open) {
					setOpen(next);
					setToggled(true);
				}
			}}
			{...stylex.props(styles.item, open && styles.itemOpen)}
		>
			<summary {...stylex.props(styles.summary)}>
				{item.question}
				<CaretDownIcon
					size={16}
					aria-hidden="true"
					{...stylex.props(styles.caret, open && styles.caretOpen)}
				/>
			</summary>
			<div
				{...stylex.props(styles.answer, open && toggled && styles.answerOpen)}
			>
				<Paragraphs text={item.answer} tone="muted" />
			</div>
		</details>
	);
}

export function Faq({ block }: { block: FaqBlock }) {
	const headingId = useId();
	const items = block.items ?? [];

	return (
		<Section id={block.anchor} labelledBy={headingId}>
			<div {...stylex.props(styles.layout)}>
				<Reveal>
					<Heading as="h2" id={headingId}>
						{block.heading}
					</Heading>
				</Reveal>
				<Reveal delay={100} style={styles.list}>
					{items.map((item, index) => (
						<FaqItem
							key={item.id ?? item.question}
							item={item}
							initiallyOpen={index === 0}
						/>
					))}
				</Reveal>
			</div>
		</Section>
	);
}
