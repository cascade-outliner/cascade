import type { CollectionConfig } from "payload";

export const Blogs: CollectionConfig = {
	slug: "blogs",
	admin: {
		useAsTitle: "title",
		defaultColumns: ["title", "author", "publishedAt", "status"],
	},
	fields: [
		{
			name: "slug",
			type: "slug",
			required: true,
			admin: {
				position: "sidebar"
			}
		},
		{
			name: "title",
			type: "text",
			required: true,
		},
		{
			name: "author",
			type: "relationship",
			relationTo: "authors",
			required: true,
			admin: {
				position: "sidebar",
			},
		},
		{
			type: "row",
			fields: [
				{
					name: "coverImage",
					type: "upload",
					relationTo: "media",
				},
				{
					name: "thumbnailImage",
					type: "upload",
					relationTo: "media",
				},
			],
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
	],
	versions: {
		drafts: true,
	},
};
