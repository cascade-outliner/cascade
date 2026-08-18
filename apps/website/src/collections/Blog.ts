import type { CollectionConfig } from "payload";

export const Blogs: CollectionConfig = {
	slug: "blogs",
	admin: {
		useAsTitle: "title",
		defaultColumns: ["title", "author", "publishedAt", "status"],
	},
	fields: [
		{
			name: "title",
			type: "text",
			required: true,
		},
		{
			name: "slug",
			type: "text",
			required: true,
			unique: true,
			index: true,
		},
		{
			name: "author",
			type: "relationship",
			relationTo: "authors",
			required: true,
		},
		{
			name: "heroImage",
			type: "upload",
			relationTo: "media",
		},
		{
			name: "excerpt",
			type: "textarea",
		},
		{
			name: "content",
			type: "richText",
			required: true,
		},
		{
			name: "publishedAt",
			type: "date",
			admin: {
				date: {
					pickerAppearance: "dayAndTime",
				},
				condition: (_, siblingData) => siblingData.status === "published",
			},
		},
	],
	versions: {
		drafts: true,
	},
};
