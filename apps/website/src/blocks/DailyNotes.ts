import type { Block } from "payload";

export const DailyNotes: Block = {
	slug: "dailyNotes",
	interfaceName: "DailyNotesBlock",
	labels: { singular: "Daily notes", plural: "Daily notes" },
	fields: [
		{
			name: "anchor",
			type: "text",
			admin: {
				description: "Optional id for in-page links, e.g. daily-notes.",
			},
		},
		{
			name: "eyebrow",
			type: "text",
		},
		{
			name: "heading",
			type: "text",
			required: true,
		},
		{
			name: "body",
			type: "textarea",
			required: true,
		},
		{
			name: "preview",
			type: "group",
			label: "Example day",
			fields: [
				{
					name: "dateLabel",
					type: "text",
					required: true,
					defaultValue: "Thursday, Sep 24",
				},
				{
					name: "entries",
					type: "array",
					minRows: 1,
					labels: { singular: "Entry", plural: "Entries" },
					admin: {
						components: {
							RowLabel: "@/blocks/row-labels#TextRowLabel",
						},
					},
					fields: [
						{
							name: "text",
							type: "text",
							required: true,
							admin: {
								description: "Wrap a [[link]] in double brackets to tint it.",
							},
						},
						{
							name: "carriedFrom",
							type: "text",
							admin: {
								description:
									"Set to mark this as a task rolled over from an earlier day, e.g. Tue.",
							},
						},
					],
				},
			],
		},
	],
};
