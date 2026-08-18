import type { CollectionConfig } from "payload";
import { blocks } from "@/blocks";

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
		{
			name: "blocks",
			type: "blocks",
			blocks: blocks,
		},
	],
};
