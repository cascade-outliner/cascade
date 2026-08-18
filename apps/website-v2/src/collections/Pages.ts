import type { CollectionConfig } from "payload";

export const Pages: CollectionConfig = {
	slug: "pages",
	admin: {
		useAsTitle: "name",
	},
	fields: [
		{
			name: "name",
			type: "text",
			required: true,
		},
	],
};
