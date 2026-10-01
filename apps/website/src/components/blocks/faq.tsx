import { CaretDownIcon } from "@phosphor-icons/react";
import { useId } from "react";
import type { FaqBlock } from "@/payload-types";
import { css } from "@/styled-system/css";
import { Heading } from "../ui/heading";
import { Section } from "../ui/section";
import { Paragraphs } from "../ui/text";

const styles = {
	layout: css({
		display: "grid",
		gridTemplateColumns: {
			base: "320px minmax(0, 1fr)",
			_tablet: "minmax(0, 1fr)",
		},
		gap: { base: "site.14", _tablet: "site.6" },
		alignItems: "start",
	}),
	list: css({
		display: "flex",
		flexDirection: "column",
		borderBottomWidth: "thin",
		borderBottomStyle: "solid",
		borderBottomColor: "site.rule",
	}),
	item: css({
		borderTopWidth: "thin",
		borderTopStyle: "solid",
		borderTopColor: "site.rule",
		paddingBlock: "site.5",
	}),
	summary: css({
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "site.4",
		listStyle: "none",
		cursor: "pointer",
		fontSize: "site.h4",
		fontWeight: 600,
		lineHeight: "label",
		borderRadius: "md",
		outline: "none",
		boxShadow: { base: "none", _focusVisible: "focusRing" },
		_marker: { display: "none" },
	}),
	caret: css({
		flexShrink: 0,
		color: "site.muted",
		transitionProperty: "[transform]",
		transitionDuration: { base: "150", _motionReduce: "0" },
	}),
	caretOpen: css({
		transform: "rotate(180deg)",
	}),
	answer: css({
		marginBlockStart: "site.3",
		maxWidth: "prose.xl",
		display: "flex",
		flexDirection: "column",
		gap: "site.3",
		fontSize: "site.body",
	}),
};

export function Faq({ block }: { block: FaqBlock }) {
	const headingId = useId();
	const items = block.items ?? [];

	return (
		<Section id={block.anchor} labelledBy={headingId}>
			<div className={styles.layout}>
				<Heading as="h2" id={headingId}>
					{block.heading}
				</Heading>
				<div className={styles.list}>
					{items.map((item, index) => (
						<details
							key={item.id ?? item.question}
							open={index === 0}
							name="faq"
							className={styles.item}
						>
							<summary className={styles.summary}>
								{item.question}
								<CaretDownIcon
									size={16}
									aria-hidden="true"
									className={styles.caret}
								/>
							</summary>
							<div className={styles.answer}>
								<Paragraphs text={item.answer} tone="muted" />
							</div>
						</details>
					))}
				</div>
			</div>
		</Section>
	);
}
