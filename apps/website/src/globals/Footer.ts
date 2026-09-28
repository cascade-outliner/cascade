import type { GlobalConfig } from "payload";

export const Footer: GlobalConfig = {
	slug: "footer",
	access: {
		read: () => true,
	},
	fields: [
		{
			name: "copyright",
			type: "text",
			required: true,
			defaultValue: "Cascadelist",
			admin: { description: "Shown as “© <year> <copyright>”." },
		},
		{
			name: "links",
			type: "array",
			labels: { singular: "Link", plural: "Links" },
			admin: {
				components: {
					RowLabel: "@/blocks/row-labels#LabelRowLabel",
				},
			},
			fields: [
				{
					name: "label",
					type: "text",
					required: true,
				},
				{
					name: "url",
					type: "text",
					required: true,
				},
			],
		},
	],
};
