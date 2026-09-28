import type { Block } from "payload";

export const Faq: Block = {
	slug: "faq",
	interfaceName: "FaqBlock",
	labels: { singular: "FAQ", plural: "FAQs" },
	fields: [
		{
			name: "anchor",
			type: "text",
			admin: { description: "Optional id for in-page links, e.g. faq." },
		},
		{
			name: "heading",
			type: "text",
			required: true,
		},
		{
			name: "items",
			type: "array",
			minRows: 1,
			labels: { singular: "Question", plural: "Questions" },
			admin: {
				components: {
					RowLabel: "@/blocks/row-labels#QuestionRowLabel",
				},
			},
			fields: [
				{
					name: "question",
					type: "text",
					required: true,
				},
				{
					name: "answer",
					type: "textarea",
					required: true,
				},
			],
		},
	],
};
