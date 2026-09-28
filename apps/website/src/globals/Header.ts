import type { GlobalConfig } from "payload";
import { linkField } from "../fields/link";

export const Header: GlobalConfig = {
	slug: "header",
	access: {
		read: () => true,
	},
	fields: [
		{
			name: "siteName",
			type: "text",
			required: true,
			defaultValue: "Cascadelist",
			admin: {
				description: "Wordmark next to the logo, and the page title suffix.",
			},
		},
		{
			name: "navigation",
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
					admin: {
						description: "Usually an anchor on the home page, e.g. /#pricing.",
					},
				},
			],
		},
		linkField({
			name: "secondaryAction",
			label: "Secondary action",
			required: false,
		}),
		linkField({ name: "primaryAction", label: "Primary action" }),
	],
};
