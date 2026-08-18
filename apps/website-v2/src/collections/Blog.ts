import type { CollectionConfig } from "payload";

export const Blog: CollectionConfig = {
	slug: "blog",
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
