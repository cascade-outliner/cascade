import { ArrowBendDownRightIcon } from "@phosphor-icons/react";
import { useId } from "react";
import type { DailyNotesBlock } from "@/payload-types";
import { css, cva } from "@/styled-system/css";
import { Card } from "../ui/card";
import { Eyebrow } from "../ui/eyebrow";
import { Heading } from "../ui/heading";
import { Mono } from "../ui/mono";
import { Section } from "../ui/section";
import { Paragraphs } from "../ui/text";
import { WikiText } from "../ui/wiki-text";

const styles = {
	panel: css({
		display: "grid",
		gridTemplateColumns: {
			base: "minmax(0, 1fr) minmax(0, 1.1fr)",
			_tablet: "minmax(0, 1fr)",
		},
		gap: { base: "site.14", _tablet: "site.10" },
		alignItems: "center",
		padding: {
			base: "site.14",
			_tabletOnly: "site.8",
			_mobile: "site.6",
		},
		borderRadius: "site.panel",
		backgroundColor: "site.tint",
	}),
	copy: css({
		display: "flex",
		flexDirection: "column",
		gap: "site.5",
	}),
	body: css.raw({
		maxWidth: "popup.lg",
	}),
	preview: css.raw({
		gap: "site.4.5",
		paddingBlock: "site.5.5",
		paddingInline: "site.6",
	}),
	week: css({
		display: "flex",
		gap: "1.5",
		listStyle: "none",
		margin: "0",
		padding: "0",
	}),
	dayNumber: css({
		fontSize: "site.small",
		fontWeight: 600,
	}),
	date: css({
		fontSize: "site.title",
		fontWeight: 700,
	}),
	entries: css({
		listStyle: "none",
		margin: "0",
		padding: "0",
		display: "flex",
		flexDirection: "column",
		gap: "2.5",
		fontSize: "site.small",
	}),
	bullet: css({
		width: "dot.lg",
		height: "dot.lg",
		flexShrink: 0,
		borderRadius: "circle",
		backgroundColor: "site.muted",
		marginInline: "1.5",
	}),
	carriedIcon: css({
		color: "site.primary",
		flexShrink: 0,
	}),
	carriedLabel: css.raw({
		marginInlineStart: "auto",
		fontSize: "site.micro",
	}),
};

const day = cva({
	base: {
		flex: "1",
		paddingBlock: "2",
		borderRadius: "site.pill",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "0.5",
		color: "site.muted",
	},
	variants: {
		when: {
			past: {},
			today: {
				backgroundColor: "site.primary",
				color: "site.onPrimary",
			},
			future: {
				color: "site.onDarkMuted",
			},
		},
	},
});

const entryRow = cva({
	base: {
		display: "flex",
		alignItems: "center",
		gap: "2.5",
	},
	variants: {
		carried: {
			true: {
				paddingBlock: "2",
				paddingInline: "2.5",
				marginBlockStart: "1",
				marginInline: "-2.5",
				borderRadius: "site.pill",
				backgroundColor: "site.primaryTint",
			},
		},
	},
});

const WEEK = [
	{ label: "Mon", day: 21 },
	{ label: "Tue", day: 22 },
	{ label: "Wed", day: 23 },
	{ label: "Thu", day: 24, today: true },
	{ label: "Fri", day: 25, future: true },
];

export function DailyNotes({ block }: { block: DailyNotesBlock }) {
	const headingId = useId();
	const entries = block.preview.entries ?? [];

	return (
		<Section id={block.anchor} labelledBy={headingId}>
			<div className={styles.panel}>
				<div className={styles.copy}>
					{block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
					<Heading as="h2" id={headingId}>
						{block.heading}
					</Heading>
					<Paragraphs text={block.body} css={styles.body} />
				</div>
				<Card tone="raised" padding="none" css={styles.preview}>
					<ol aria-label="This week" className={styles.week}>
						{WEEK.map((entry) => (
							<li
								key={entry.label}
								aria-current={entry.today ? "date" : undefined}
								className={day({
									when: entry.today
										? "today"
										: entry.future
											? "future"
											: "past",
								})}
							>
								<Mono tone="inherit">{entry.label}</Mono>
								<span className={styles.dayNumber}>{entry.day}</span>
							</li>
						))}
					</ol>
					<p className={styles.date}>{block.preview.dateLabel}</p>
					<ul className={styles.entries}>
						{entries.map((entry) =>
							entry.carriedFrom ? (
								<li
									key={entry.id ?? entry.text}
									className={entryRow({ carried: true })}
								>
									<ArrowBendDownRightIcon
										size={15}
										aria-hidden="true"
										className={styles.carriedIcon}
									/>
									<span>
										<WikiText text={entry.text} />
									</span>
									<Mono tone="primary" css={styles.carriedLabel}>
										carried from {entry.carriedFrom}
									</Mono>
								</li>
							) : (
								<li key={entry.id ?? entry.text} className={entryRow()}>
									<span aria-hidden="true" className={styles.bullet} />
									<span>
										<WikiText text={entry.text} />
									</span>
								</li>
							),
						)}
					</ul>
				</Card>
			</div>
		</Section>
	);
}
