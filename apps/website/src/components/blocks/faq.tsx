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
		gap: { base: "3.5rem", _tablet: "1.5rem" },
		alignItems: "start",
	}),
	list: css({
		display: "flex",
		flexDirection: "column",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: "site.rule",
	}),
	item: css({
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: "site.rule",
		paddingBlock: "1.25rem",
	}),
	summary: css({
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
		boxShadow: { base: "none", _focusVisible: "site.focus" },
		_marker: { display: "none" },
	}),
	caret: css({
		flexShrink: 0,
		color: "site.muted",
		transitionProperty: "transform",
		transitionDuration: { base: "150ms", _motionReduce: "0ms" },
	}),
	caretOpen: css({
		transform: "rotate(180deg)",
	}),
	answer: css({
		marginBlockStart: "0.75rem",
		maxWidth: "620px",
		display: "flex",
		flexDirection: "column",
		gap: "0.75rem",
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
