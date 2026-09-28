import type { Field, GroupField } from "payload";

export interface LinkFieldOptions {
	name?: string;
	label?: string;
	required?: boolean;
}

/**
 * A call-to-action link: label plus either a path on this site or a full URL.
 * Shared by the header, footer and every block that carries a button.
 */
export function linkField({
	name = "link",
	label = "Link",
	required = true,
}: LinkFieldOptions = {}): GroupField {
	const fields: Field[] = [
		{
			name: "label",
			type: "text",
			required,
		},
		{
			name: "url",
			type: "text",
			required,
			admin: {
				description: "A path like /pricing or a full https:// URL.",
			},
		},
		{
			name: "newTab",
			type: "checkbox",
			label: "Open in a new tab",
			defaultValue: false,
		},
	];

	return {
		name,
		type: "group",
		label,
		interfaceName: "Link",
		fields,
	};
}
