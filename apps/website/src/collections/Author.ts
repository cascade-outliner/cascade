import type { CollectionConfig } from "payload";

export const Authors: CollectionConfig = {
	slug: "authors",
	admin: {
		useAsTitle: "name",
		defaultColumns: ["name", "email", "updatedAt"],
	},
	fields: [
		{
			name: "slug",
			type: "slug",
			required: true,
			admin: {
				position: "sidebar",
			},
		},
		{
			type: "row",
			fields: [
				{
					name: "name",
					type: "text",
					required: true,
				},
				{
					name: "email",
					type: "email",
					required: true,
					unique: true,
				},
			],
		},
		{
			name: "avatar",
			type: "upload",
			relationTo: "media",
		},
		{
			name: "bio",
			type: "textarea",
		},
	],
};
