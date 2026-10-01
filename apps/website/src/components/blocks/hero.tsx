import type { HeroBlock } from "@/payload-types";
import { css } from "@/styled-system/css";
import { LiveOutline } from "../live-outline/live-outline";
import { ButtonLink } from "../ui/button-link";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Heading } from "../ui/heading";
import { Mono } from "../ui/mono";
import { Paragraphs } from "../ui/text";

const styles = {
	hero: css({
		display: "grid",
		gridTemplateColumns: {
			base: "minmax(0, 1fr) 540px",
			_tablet: "minmax(0, 1fr)",
		},
		gap: { base: "4rem", _tablet: "3rem" },
		alignItems: "center",
		paddingBlockStart: { base: "3.5rem", _tablet: "1.5rem" },
		paddingBlockEnd: { base: "6rem", _tablet: "4.5rem" },
	}),
	copy: css({
		display: "flex",
		flexDirection: "column",
		gap: "1.625rem",
	}),
	body: css.raw({
		maxWidth: "480px",
	}),
	actions: css({
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: "0.75rem",
	}),
	outlineWrap: css({
		position: "relative",
		width: "100%",
		maxWidth: { _tablet: "620px" },
		marginInline: { _tablet: "auto" },
		marginBlockStart: { _tablet: "1.5rem" },
	}),
	sticker: css({
		position: "absolute",
		top: "-30px",
		insetInlineEnd: { base: "-14px", _mobile: "8px" },
		transform: "rotate(4deg)",
		zIndex: 2,
		paddingBlock: "6px",
		paddingInline: "11px",
		borderRadius: "8px",
		backgroundColor: "site.ink",
		color: "site.onDark",
		fontFamily: "mono",
		fontSize: "site.eyebrow",
		fontWeight: 500,
		whiteSpace: "nowrap",
	}),
};

export function Hero({ block }: { block: HeroBlock }) {
	return (
		<Container>
			<header className={styles.hero}>
				<div className={styles.copy}>
					{block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
					<Heading as="h1">{block.heading}</Heading>
					<Paragraphs text={block.body} size="lead" css={styles.body} />
					<div className={styles.actions}>
						<ButtonLink
							href={block.cta.url}
							newTab={block.cta.newTab}
							size="lg"
						>
							{block.cta.label}
						</ButtonLink>
						{block.note && <Mono>{block.note}</Mono>}
					</div>
				</div>
				<div className={styles.outlineWrap}>
					{block.sticker && (
						<span aria-hidden="true" className={styles.sticker}>
							{block.sticker}
						</span>
					)}
					<LiveOutline />
				</div>
			</header>
		</Container>
	);
}
