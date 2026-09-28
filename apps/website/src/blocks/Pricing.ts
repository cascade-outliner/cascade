import type { Block } from "payload";
import { linkField } from "../fields/link";

export const Pricing: Block = {
	slug: "pricing",
	interfaceName: "PricingBlock",
	labels: { singular: "Pricing", plural: "Pricing" },
	fields: [
		{
			name: "anchor",
			type: "text",
			admin: { description: "Optional id for in-page links, e.g. pricing." },
		},
		{
			name: "heading",
			type: "text",
			required: true,
		},
		{
			name: "body",
			type: "textarea",
		},
		{
			name: "plans",
			type: "array",
			minRows: 1,
			maxRows: 3,
			labels: { singular: "Plan", plural: "Plans" },
			admin: {
				components: {
					RowLabel: "@/blocks/row-labels#NameRowLabel",
				},
			},
			fields: [
				{
					name: "name",
					type: "text",
					required: true,
				},
				{
					type: "row",
					fields: [
						{
							name: "price",
							type: "text",
							required: true,
							admin: { width: "50%", description: "e.g. $6" },
						},
						{
							name: "period",
							type: "text",
							admin: {
								width: "50%",
								description: "e.g. / month, billed yearly",
							},
						},
					],
				},
				{
					name: "featured",
					type: "checkbox",
					defaultValue: false,
					admin: { description: "Dark card with the badge." },
				},
				{
					name: "badge",
					type: "text",
					admin: {
						condition: (_, siblingData) => Boolean(siblingData?.featured),
					},
				},
				{
					name: "features",
					type: "array",
					minRows: 1,
					labels: { singular: "Feature", plural: "Features" },
					admin: {
						components: {
							RowLabel: "@/blocks/row-labels#TextRowLabel",
						},
					},
					fields: [
						{
							name: "text",
							type: "text",
							required: true,
						},
					],
				},
				linkField({ name: "cta", label: "Button" }),
			],
		},
	],
};
