import { Button } from "@cascade/ui/button";
import { VirtualTree } from "@cascade/ui/tree/virtual-tree";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { HouseIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { useDemoTree } from "#/lib/use-demo-tree";

function DemoBreadcrumbs({
	ancestors,
	onNavigate,
}: {
	ancestors: { id: string; label: string }[];
	onNavigate: (id: string | null) => void;
}) {
	return (
		<nav aria-label="Breadcrumb" className="mb-4 text-sm">
			<ol className="flex items-center gap-1.5 flex-wrap">
				<li className="flex items-center">
					<button
						type="button"
						onClick={() => onNavigate(null)}
						aria-label="Back to full outline"
						className="hover:text-redleather transition-colors"
					>
						<HouseIcon size={16} weight="bold" />
					</button>
				</li>
				{ancestors.map((crumb, index) => (
					<li key={crumb.id} className="flex items-center gap-1.5 min-w-0">
						<span aria-hidden className="opacity-40">
							/
						</span>
						{index === ancestors.length - 1 ? (
							<span
								aria-current="page"
								className="max-w-48 truncate opacity-60"
							>
								{crumb.label}
							</span>
						) : (
							<button
								type="button"
								onClick={() => onNavigate(crumb.id)}
								className="max-w-48 truncate hover:text-redleather transition-colors"
							>
								{crumb.label}
							</button>
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}

export function Hero() {
	const [rootId, setRootId] = useState<string | null>(null);
	const tree = useDemoTree(rootId);
	return (
		<header className="mx-auto max-w-4xl px-8 pt-24 pb-18 text-center">
			<h1 className="mb-6 text-balance font-serif text-5xl md:text-[68px] leading-[1.05] font-light tracking-[-0.02em]">
				A quieter place to think in lists.
			</h1>
			<p className="mx-auto mb-12 max-w-lg text-pretty text-lg text-graphite">
				Cascade is an infinitely nested outliner.
				<br />
				One outline for all your notes.
			</p>
			<div className="flex flex-col items-center gap-3.5">
				<Button
					nativeButton={false}
					// biome-ignore lint/a11y/useAnchorContent: content is supplied as Button's children and composed onto the anchor by Base UI's render prop
					render={<a href="/register" />}
					icon={<ArrowRightIcon className="size-4" weight="bold" />}
				>
					Try Cascade; it&rsquo;s free
				</Button>
				<p className="text-sm text-graphite">
					Or try the outline below — it&rsquo;s live, nothing is saved.
				</p>
			</div>
			<VirtualTree
				tree={tree}
				indentSize={16}
				renderNodeLink={(id) => (
					<button
						type="button"
						aria-label="Open node"
						onClick={() => setRootId(id)}
						className="relative z-0 after:absolute after:-inset-2 w-2 h-2 rounded-full bg-dark-grey hover:bg-redleather shrink-0 hover:scale-150 hover:-z-10 transition-all ease-in-out"
					/>
				)}
				header={
					rootId !== null ? (
						<DemoBreadcrumbs
							ancestors={tree.ancestors}
							onNavigate={setRootId}
						/>
					) : undefined
				}
				className="mt-10 h-[420px] overflow-auto rounded-2xl border border-dark-grey/10 bg-white text-left shadow-lg shadow-dark-grey/10"
				contentClassName="max-w-none mx-0 px-6 py-6"
			/>
		</header>
	);
}
