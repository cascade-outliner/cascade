import type { Block } from "payload";
import { faq } from "../faq/faq";

export const blocksWithTitleAllowedBlocks: Block[] = [faq];

export const blockWithTitle: Block = {
	slug: "blockWithTitle",
	fields: [
		{
			name: "title",
			type: "text",
			required: true,
		},
		{
			name: "content",
			type: "blocks",
			required: true,
			blocks: blocksWithTitleAllowedBlocks,
		},
	],
};
