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
		gap: { base: "site.16", _tablet: "site.12" },
		alignItems: "center",
		paddingBlockStart: { base: "site.14", _tablet: "site.6" },
		paddingBlockEnd: { base: "site.24", _tablet: "site.18" },
	}),
	copy: css({
		display: "flex",
		flexDirection: "column",
		gap: "site.6.5",
	}),
	body: css.raw({
		maxWidth: "prose.lg",
	}),
	actions: css({
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: "site.3",
	}),
	outlineWrap: css({
		position: "relative",
		width: "full",
		maxWidth: { _tablet: "prose.xl" },
		marginInline: { _tablet: "auto" },
		marginBlockStart: { _tablet: "site.6" },
	}),
	sticker: css({
		position: "absolute",
		top: "[-30px]",
		insetInlineEnd: { base: "-3.5", _mobile: "2" },
		transform: "rotate(4deg)",
		zIndex: "sticky",
		paddingBlock: "1.5",
		paddingInline: "[11px]",
		borderRadius: "md",
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
