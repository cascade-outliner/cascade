import { ArrowBendDownRightIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import type { DailyNotesBlock } from "@/payload-types";
import { media } from "@/theme/breakpoints.stylex";
import { site } from "@/theme/site.stylex";
import { Card } from "../ui/card";
import { Eyebrow } from "../ui/eyebrow";
import { Heading } from "../ui/heading";
import { Mono } from "../ui/mono";
import { Section } from "../ui/section";
import { Paragraphs } from "../ui/text";
import { WikiText } from "../ui/wiki-text";

const styles = stylex.create({
	panel: {
		display: "grid",
		gridTemplateColumns: {
			default: "minmax(0, 1fr) minmax(0, 1.1fr)",
			[media.tablet]: "minmax(0, 1fr)",
		},
		gap: { default: "3.5rem", [media.tablet]: "2.5rem" },
		alignItems: "center",
		padding: {
			default: "3.5rem",
			[media.tabletOnly]: "2rem",
			[media.mobile]: "1.5rem",
		},
		borderRadius: "28px",
		backgroundColor: site.tint,
	},
	copy: {
		display: "flex",
		flexDirection: "column",
		gap: "1.25rem",
	},
	body: {
		maxWidth: 440,
	},
	preview: {
		gap: "1.125rem",
		padding: "1.375rem 1.5rem",
	},
	week: {
		display: "flex",
		gap: 6,
		listStyle: "none",
		margin: 0,
		padding: 0,
	},
	day: {
		flex: 1,
		paddingBlock: 8,
		borderRadius: "10px",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: 2,
		color: site.muted,
	},
	dayToday: {
		backgroundColor: site.primary,
		color: "#ffffff",
	},
	dayFuture: {
		color: site.onDarkMuted,
	},
	dayNumber: {
		fontSize: "0.9375rem",
		fontWeight: 600,
	},
	date: {
		fontSize: "1.5rem",
		fontWeight: 700,
	},
	entries: {
		listStyle: "none",
		margin: 0,
		padding: 0,
		display: "flex",
		flexDirection: "column",
		gap: 10,
		fontSize: "0.9375rem",
	},
	entry: {
		display: "flex",
		alignItems: "center",
		gap: 10,
	},
	bullet: {
		width: 6,
		height: 6,
		flexShrink: 0,
		borderRadius: "50%",
		backgroundColor: site.muted,
		marginInline: 6,
	},
	carried: {
		paddingBlock: 8,
		paddingInline: 10,
		marginBlockStart: 4,
		marginInline: -10,
		borderRadius: "10px",
		backgroundColor: site.primaryTint,
	},
	carriedIcon: {
		color: site.primary,
		flexShrink: 0,
	},
	carriedLabel: {
		marginInlineStart: "auto",
		fontSize: "0.625rem",
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
			<div {...stylex.props(styles.panel)}>
				<div {...stylex.props(styles.copy)}>
					{block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
					<Heading as="h2" id={headingId}>
						{block.heading}
					</Heading>
					<Paragraphs text={block.body} style={styles.body} />
				</div>
				<Card tone="raised" padding="none" style={styles.preview}>
					<ol aria-label="This week" {...stylex.props(styles.week)}>
						{WEEK.map((entry) => (
							<li
								key={entry.label}
								aria-current={entry.today ? "date" : undefined}
								{...stylex.props(
									styles.day,
									entry.today && styles.dayToday,
									entry.future && styles.dayFuture,
								)}
							>
								<Mono tone="inherit">{entry.label}</Mono>
								<span {...stylex.props(styles.dayNumber)}>{entry.day}</span>
							</li>
						))}
					</ol>
					<p {...stylex.props(styles.date)}>{block.preview.dateLabel}</p>
					<ul {...stylex.props(styles.entries)}>
						{entries.map((entry) =>
							entry.carriedFrom ? (
								<li
									key={entry.id ?? entry.text}
									{...stylex.props(styles.entry, styles.carried)}
								>
									<ArrowBendDownRightIcon
										size={15}
										aria-hidden="true"
										{...stylex.props(styles.carriedIcon)}
									/>
									<span>
										<WikiText text={entry.text} />
									</span>
									<Mono tone="primary" style={styles.carriedLabel}>
										carried from {entry.carriedFrom}
									</Mono>
								</li>
							) : (
								<li
									key={entry.id ?? entry.text}
									{...stylex.props(styles.entry)}
								>
									<span aria-hidden="true" {...stylex.props(styles.bullet)} />
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
