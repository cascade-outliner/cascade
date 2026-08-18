import type { Block } from "payload";

export const blocksWithTitleAllowedBlocks: Block[] = [];

export const faq: Block = {
    slug: "faq",
    fields: [
        {
            name: "items",
            type: "array",
            fields: [
                {
                    name: "question",
                    type: "text",
                    required: true,
                },
                {
                    name: "answer",
                    type: "richText",
                    required: true,
                },
            ],
        }
    ],
};
