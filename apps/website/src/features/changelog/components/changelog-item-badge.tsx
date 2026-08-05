import { cva } from "@cascade/ui/cva.config";
import { m } from "#/paraglide/messages.js";
import type { ChangelogItemType } from "../model/changelog-parser";

const typeBadge = cva({
	base: "relative -top-px mr-1.5 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium align-middle",
	variants: {
		type: {
			feat: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-400/15 dark:text-emerald-300",
			fix: "border-amber-600/30 bg-amber-600/10 text-amber-700 dark:border-amber-400/35 dark:bg-amber-400/15 dark:text-amber-300",
			chore:
				"border-ink/15 bg-transparent text-muted dark:border-surface/15 dark:text-surface/60",
			perf: "border-blue-600/30 bg-blue-600/10 text-blue-700 dark:border-blue-400/35 dark:bg-blue-400/15 dark:text-blue-300",
		} satisfies Record<ChangelogItemType, string>,
	},
});

const badgeLabels: Record<ChangelogItemType, () => string> = {
	feat: m.changelog_label_feat,
	fix: m.changelog_label_fix,
	chore: m.changelog_label_chore,
	perf: m.changelog_label_perf,
};

export function ChangelogItemBadge({ type }: { type: ChangelogItemType }) {
	return <span className={typeBadge({ type })}>{badgeLabels[type]()}</span>;
}
