import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { siteLayout } from "@/theme/site.stylex";
import { Container } from "./container";

const styles = stylex.create({
	section: {
		paddingBlockEnd: siteLayout.sectionGap,
		scrollMarginBlockStart: "1.5rem",
	},
});

export interface SectionProps {
	id?: string | null;
	/** The heading id, so the landmark is announced by its title. */
	labelledBy?: string;
	children: ReactNode;
	/** Skip the Container, for full-bleed sections. */
	bleed?: boolean;
	style?: stylex.StyleXStyles;
}

export function Section({
	id,
	labelledBy,
	children,
	bleed = false,
	style,
}: SectionProps) {
	return (
		<section
			id={id ?? undefined}
			aria-labelledby={labelledBy}
			{...stylex.props(styles.section, style)}
		>
			{bleed ? children : <Container>{children}</Container>}
		</section>
	);
}
