"use client";

import { useRowLabel } from "@payloadcms/ui";

function makeRowLabel<Key extends string>(key: Key, fallback: string) {
	return function RowLabel() {
		const { data, rowNumber } = useRowLabel<Partial<Record<Key, string>>>();
		const value = data?.[key];
		return <span>{value || `${fallback} ${(rowNumber ?? 0) + 1}`}</span>;
	};
}

export const TitleRowLabel = makeRowLabel("title", "Feature");
export const NameRowLabel = makeRowLabel("name", "Plan");
export const TextRowLabel = makeRowLabel("text", "Item");
export const QuestionRowLabel = makeRowLabel("question", "Question");
export const LabelRowLabel = makeRowLabel("label", "Link");
