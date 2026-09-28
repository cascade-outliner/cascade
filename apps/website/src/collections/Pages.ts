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
		read: () => true,
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
			name: "description",
			type: "textarea",
			admin: {
				position: "sidebar",
				description: "Meta description for search engines and link previews.",
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
