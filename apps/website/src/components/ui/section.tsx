import type { ReactNode } from "react";
import { css } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";
import { Container } from "./container";

const styles = {
	section: css.raw({
		paddingBlockEnd: "site.sectionGap",
		scrollMarginBlockStart: "1.5rem",
	}),
};

export interface SectionProps {
	id?: string | null;
	/** The heading id, so the landmark is announced by its title. */
	labelledBy?: string;
	children: ReactNode;
	/** Skip the Container, for full-bleed sections. */
	bleed?: boolean;
	css?: SystemStyleObject;
}

export function Section({
	id,
	labelledBy,
	children,
	bleed = false,
	css: cssProp,
}: SectionProps) {
	return (
		<section
			id={id ?? undefined}
			aria-labelledby={labelledBy}
			className={css(styles.section, cssProp)}
		>
			{bleed ? children : <Container>{children}</Container>}
		</section>
	);
}
