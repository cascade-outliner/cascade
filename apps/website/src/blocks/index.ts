import type { Block } from "payload";
import { Cta } from "./Cta";
import { DailyNotes } from "./DailyNotes";
import { Faq } from "./Faq";
import { FeatureGrid } from "./FeatureGrid";
import { Hero } from "./Hero";
import { Pricing } from "./Pricing";

export const pageBlocks: Block[] = [
	Hero,
	FeatureGrid,
	DailyNotes,
	Pricing,
	Faq,
	Cta,
];
