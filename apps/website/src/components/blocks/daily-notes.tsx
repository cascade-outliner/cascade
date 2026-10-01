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
		gap: { base: "3.5rem", _tablet: "2.5rem" },
		alignItems: "center",
		padding: {
			base: "3.5rem",
			_tabletOnly: "2rem",
			_mobile: "1.5rem",
		},
		borderRadius: "28px",
		backgroundColor: "site.tint",
	}),
	copy: css({
		display: "flex",
		flexDirection: "column",
		gap: "1.25rem",
	}),
	body: css.raw({
		maxWidth: "440px",
	}),
	preview: css.raw({
		gap: "1.125rem",
		paddingBlock: "1.375rem",
		paddingInline: "1.5rem",
	}),
	week: css({
		display: "flex",
		gap: "6px",
		listStyle: "none",
		margin: 0,
		padding: 0,
	}),
	dayNumber: css({
		fontSize: "0.9375rem",
		fontWeight: 600,
	}),
	date: css({
		fontSize: "1.5rem",
		fontWeight: 700,
	}),
	entries: css({
		listStyle: "none",
		margin: 0,
		padding: 0,
		display: "flex",
		flexDirection: "column",
		gap: "10px",
		fontSize: "0.9375rem",
	}),
	bullet: css({
		width: "6px",
		height: "6px",
		flexShrink: 0,
		borderRadius: "50%",
		backgroundColor: "site.muted",
		marginInline: "6px",
	}),
	carriedIcon: css({
		color: "site.primary",
		flexShrink: 0,
	}),
	carriedLabel: css.raw({
		marginInlineStart: "auto",
		fontSize: "0.625rem",
	}),
};

const day = cva({
	base: {
		flex: 1,
		paddingBlock: "8px",
		borderRadius: "10px",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "2px",
		color: "site.muted",
	},
	variants: {
		when: {
			past: {},
			today: {
				backgroundColor: "site.primary",
				color: "#ffffff",
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
		gap: "10px",
	},
	variants: {
		carried: {
			true: {
				paddingBlock: "8px",
				paddingInline: "10px",
				marginBlockStart: "4px",
				marginInline: "-10px",
				borderRadius: "10px",
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
