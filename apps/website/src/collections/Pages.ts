import type { CollectionConfig } from "payload";
import { pageBlocks } from "../blocks";
import { HOME_SLUG } from "../lib/site";

export const Pages: CollectionConfig = {
	slug: "pages",
	admin: {
		useAsTitle: "title",
		defaultColumns: ["title", "slug", "updatedAt"],
	},
	access: {
		// Anonymous readers (the frontend, REST, GraphQL, MCP) only see published pages.
		read: ({ req }) => (req.user ? true : { _status: { equals: "published" } }),
	},
	versions: { drafts: true },
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
			admin: {
				position: "sidebar",
				description: `“${HOME_SLUG}” is served at /; anything else at /<slug>.`,
			},
			hooks: {
				beforeValidate: [
					({ value }) =>
						typeof value === "string"
							? value
									.toLowerCase()
									.trim()
									.replace(/[^a-z0-9]+/g, "-")
									.replace(/^-+|-+$/g, "")
							: value,
				],
			},
		},
		{
			name: "metaTitle",
			type: "text",
			admin: {
				position: "sidebar",
				description:
					"Search result title. Falls back to the page title with the site name.",
			},
		},
		{
			name: "description",
			type: "textarea",
			admin: {
				position: "sidebar",
				description: "Meta description for search engines and link previews.",
			},
		},
		{
			name: "noIndex",
			type: "checkbox",
			defaultValue: false,
			admin: {
				position: "sidebar",
				description: "Ask search engines not to list this page.",
			},
		},
		{
			name: "layout",
			type: "blocks",
			required: true,
			blocks: pageBlocks,
		},
	],
};
