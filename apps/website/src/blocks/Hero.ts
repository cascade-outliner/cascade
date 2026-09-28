import type { Block } from "payload";
import { linkField } from "../fields/link";

export const Hero: Block = {
	slug: "hero",
	interfaceName: "HeroBlock",
	labels: { singular: "Hero", plural: "Heroes" },
	fields: [
		{
			name: "eyebrow",
			type: "text",
			admin: { description: "Short mono label above the headline." },
		},
		{
			name: "heading",
			type: "text",
			required: true,
		},
		{
			name: "body",
			type: "textarea",
			required: true,
		},
		linkField({ name: "cta", label: "Primary button" }),
		{
			name: "note",
			type: "text",
			admin: { description: "Fine print beside the button, e.g. “no card”." },
		},
		{
			name: "sticker",
			type: "text",
			admin: {
				description: "Playful tag pinned to the corner of the live outline.",
			},
		},
	],
};
