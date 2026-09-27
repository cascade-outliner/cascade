import type { Block } from "payload";
import { linkField } from "../fields/link";

export const Cta: Block = {
	slug: "cta",
	interfaceName: "CtaBlock",
	labels: { singular: "Call to action", plural: "Calls to action" },
	fields: [
		{
			name: "heading",
			type: "text",
			required: true,
		},
		{
			name: "body",
			type: "text",
		},
		linkField({ name: "cta", label: "Button" }),
	],
};
