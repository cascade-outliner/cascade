import { Fragment } from "react";
import type { Page } from "@/payload-types";
import { Cta } from "./cta";
import { DailyNotes } from "./daily-notes";
import { Faq } from "./faq";
import { FeatureGrid } from "./feature-grid";
import { Hero } from "./hero";
import { Pricing } from "./pricing";

type LayoutBlock = Page["layout"][number];

function renderBlock(block: LayoutBlock) {
	switch (block.blockType) {
		case "hero":
			return <Hero block={block} />;
		case "featureGrid":
			return <FeatureGrid block={block} />;
		case "dailyNotes":
			return <DailyNotes block={block} />;
		case "pricing":
			return <Pricing block={block} />;
		case "faq":
			return <Faq block={block} />;
		case "cta":
			return <Cta block={block} />;
		default: {
			const unknown: never = block;
			return unknown;
		}
	}
}

export function RenderBlocks({ layout }: { layout: Page["layout"] }) {
	return layout.map((block, index) => (
		<Fragment key={block.id ?? `${block.blockType}-${index}`}>
			{renderBlock(block)}
		</Fragment>
	));
}
