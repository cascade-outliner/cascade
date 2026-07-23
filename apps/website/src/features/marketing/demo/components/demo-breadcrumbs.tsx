import { HouseIcon } from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import type { DemoTreeAncestor } from "../model/demo-tree-queries";

interface DemoBreadcrumbsProps {
	ancestors: DemoTreeAncestor[];
	onNavigate: (id: string | null) => void;
}

export function DemoBreadcrumbs({
	ancestors,
	onNavigate,
}: DemoBreadcrumbsProps) {
	return (
		<nav aria-label={m.hero_breadcrumb_nav_label()} className="mb-4 text-sm">
			<ol className="flex items-center gap-1.5 flex-wrap">
				<li className="flex items-center">
					<button
						type="button"
						onClick={() => onNavigate(null)}
						aria-label={m.hero_breadcrumb_back_to_root()}
						className="hover:text-danger transition-colors"
					>
						<HouseIcon size={16} weight="bold" />
					</button>
				</li>
				{ancestors.map((ancestor, index) => (
					<li key={ancestor.id} className="flex items-center gap-1.5 min-w-0">
						<span aria-hidden className="opacity-40">
							/
						</span>
						{index === ancestors.length - 1 ? (
							<span
								aria-current="page"
								className="max-w-48 truncate opacity-60"
							>
								{ancestor.label}
							</span>
						) : (
							<button
								type="button"
								onClick={() => onNavigate(ancestor.id)}
								className="max-w-48 truncate hover:text-danger transition-colors"
							>
								{ancestor.label}
							</button>
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}
