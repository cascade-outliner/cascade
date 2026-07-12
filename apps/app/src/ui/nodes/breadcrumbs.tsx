import { Menu } from "@base-ui/react";
import { lexicalToPlainText } from "@cascade/outliner/lexical-content";
import { DotsThreeIcon, HouseIcon } from "@phosphor-icons/react/ssr";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { orpc } from "#/orpc/client";
import { m } from "#/paraglide/messages.js";

interface BreadcrumbsProps {
	nodeId: string;
}

interface Crumb {
	id: string;
	content: unknown;
}

const crumbLabel = (crumb: Crumb) =>
	lexicalToPlainText(crumb.content) || m.breadcrumbs_untitled();

function CrumbLink({ crumb }: { crumb: Crumb }) {
	return (
		<Link
			to="/node/$nodeId"
			params={{ nodeId: crumb.id }}
			viewTransition
			className="max-w-48 truncate hover:text-redleather transition-colors"
		>
			{crumbLabel(crumb)}
		</Link>
	);
}

function CollapsedCrumbs({ crumbs }: { crumbs: Crumb[] }) {
	return (
		<Menu.Root>
			<Menu.Trigger
				aria-label={m.breadcrumbs_hidden_count({ count: crumbs.length })}
				className="cursor-pointer rounded-md px-1 outline-none hover:text-redleather focus-visible:ring-2 focus-visible:ring-redleather/50 data-popup-open:text-redleather transition-colors"
			>
				<DotsThreeIcon size={16} weight="bold" />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner className="z-50 outline-none" sideOffset={6}>
					<Menu.Popup className="origin-(--transform-origin) min-w-40 max-w-72 rounded-lg border border-dark-grey/10 bg-white p-1 text-dark-grey dark:border-ginger/15 dark:bg-dark-grey dark:text-ginger shadow-lg shadow-dark-grey/15 transition-[transform,opacity] duration-150 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 outline-none">
						{crumbs.map((crumb) => (
							<Menu.Item
								key={crumb.id}
								render={
									<Link
										to="/node/$nodeId"
										params={{ nodeId: crumb.id }}
										viewTransition
									/>
								}
								className="block cursor-pointer truncate rounded-md px-3 py-1.5 text-sm outline-none data-highlighted:bg-ginger/70 dark:data-highlighted:bg-ginger/20"
							>
								{crumbLabel(crumb)}
							</Menu.Item>
						))}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}

const Separator = () => (
	<span aria-hidden className="opacity-40">
		/
	</span>
);

export function Breadcrumbs({ nodeId }: BreadcrumbsProps) {
	const { data: chain } = useSuspenseQuery(
		orpc.nodes.ancestors.queryOptions({ input: { id: nodeId } }),
	);

	const current = chain[chain.length - 1];
	const ancestors = chain.slice(0, -1);
	// ponytail: fixed collapse threshold; measure actual width if labels vary wildly
	const collapse = ancestors.length > 3;
	const head = collapse ? ancestors.slice(0, 1) : ancestors;
	const hidden = collapse ? ancestors.slice(1, -1) : [];
	const tail = collapse ? ancestors.slice(-1) : [];

	return (
		<nav aria-label={m.breadcrumbs_nav_label()} className="mb-4 text-sm">
			<ol className="flex items-center gap-1.5 flex-wrap">
				<li className="flex items-center">
					<Link
						to="/"
						viewTransition
						aria-label={m.breadcrumbs_home_label()}
						className="hover:text-redleather transition-colors"
					>
						<HouseIcon size={16} weight="bold" />
					</Link>
				</li>
				{head.map((crumb) => (
					<li key={crumb.id} className="flex items-center gap-1.5 min-w-0">
						<Separator />
						<CrumbLink crumb={crumb} />
					</li>
				))}
				{hidden.length > 0 && (
					<li className="flex items-center gap-1.5">
						<Separator />
						<CollapsedCrumbs crumbs={hidden} />
					</li>
				)}
				{tail.map((crumb) => (
					<li key={crumb.id} className="flex items-center gap-1.5 min-w-0">
						<Separator />
						<CrumbLink crumb={crumb} />
					</li>
				))}
				{current && (
					<li className="flex items-center gap-1.5 min-w-0">
						<Separator />
						<span aria-current="page" className="max-w-48 truncate opacity-60">
							{crumbLabel(current)}
						</span>
					</li>
				)}
			</ol>
		</nav>
	);
}
