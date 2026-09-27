import type { Block } from "payload";

export const FEATURE_ILLUSTRATIONS = [
	"board",
	"table",
	"links",
	"mirrors",
	"split",
	"history",
] as const;

export type FeatureIllustration = (typeof FEATURE_ILLUSTRATIONS)[number];

export const FeatureGrid: Block = {
	slug: "featureGrid",
	interfaceName: "FeatureGridBlock",
	labels: { singular: "Feature grid", plural: "Feature grids" },
	fields: [
		{
			name: "anchor",
			type: "text",
			admin: { description: "Optional id for in-page links, e.g. features." },
		},
		{
			name: "heading",
			type: "text",
			required: true,
		},
		{
			name: "body",
			type: "textarea",
		},
		{
			name: "features",
			type: "array",
			minRows: 1,
			labels: { singular: "Feature", plural: "Features" },
			admin: {
				initCollapsed: true,
				components: {
					RowLabel: "@/blocks/row-labels#TitleRowLabel",
				},
			},
			fields: [
				{
					name: "illustration",
					type: "select",
					required: true,
					options: FEATURE_ILLUSTRATIONS.map((value) => ({
						label: value[0].toUpperCase() + value.slice(1),
						value,
					})),
				},
				{
					name: "title",
					type: "text",
					required: true,
				},
				{
					name: "description",
					type: "textarea",
					required: true,
				},
			],
		},
	],
};
