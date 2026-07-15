import { cva } from "@cascade/ui/cva.config";
import { TagIcon } from "@phosphor-icons/react/ssr";

interface NodeTagPillsProps {
	tags: string[];
}

const pill = cva({
	base: [
		"inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 mr-1 text-[11.5px] font-medium",
		"border-dark-grey/15 bg-transparent text-graphite dark:border-ginger/15 dark:text-ginger/60",
	],
});

export function NodeTagPills({ tags }: NodeTagPillsProps) {
	return (
		<>
			{tags.map((tag) => (
				<span key={tag} className={pill()}>
					<TagIcon size={11} weight="bold" />
					{tag}
				</span>
			))}
		</>
	);
}
