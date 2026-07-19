import { VirtualTree } from "@cascade/outliner/virtual-tree";
import { Button } from "@cascade/ui/button";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { HouseIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { appRegisterUrl } from "#/lib/app-url";
import { useDemoTree } from "#/lib/use-demo-tree";
import { m } from "#/paraglide/messages.js";

function DemoBreadcrumbs({
	ancestors,
	onNavigate,
}: {
	ancestors: { id: string; label: string }[];
	onNavigate: (id: string | null) => void;
}) {
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
								className="max-w-48 truncate hover:text-danger transition-colors"
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
				{m.hero_heading()}
			</h1>
			<p className="mx-auto mb-12 max-w-lg text-pretty text-lg text-muted">
				{m.hero_subtitle_line1()}
				<br />
				{m.hero_subtitle_line2()}
			</p>
			<div className="flex flex-col items-center gap-3.5">
				<Button
					nativeButton={false}
					render={<a href={appRegisterUrl} />}
					icon={<ArrowRightIcon className="size-4" weight="bold" />}
				>
					{m.hero_cta()}
				</Button>
				<p className="text-sm text-muted">{m.hero_demo_hint()}</p>
			</div>
			<VirtualTree
				tree={tree}
				indentSize={16}
				renderNodeLink={({ id }) => (
					<button
						type="button"
						aria-label={m.hero_demo_open_node()}
						onClick={() => setRootId(id)}
						className="relative z-0 after:absolute after:-inset-2 w-2 h-2 rounded-full bg-ink hover:bg-danger shrink-0 hover:scale-150 hover:-z-10 transition-all ease-in-out"
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
				className="mt-10 h-[420px] overflow-auto rounded-2xl border border-ink/10 bg-white text-left shadow-lg shadow-ink/10"
				contentClassName="max-w-none mx-0 px-6 py-6"
			/>
			<p className="mt-3 text-xs text-muted">{m.hero_demo_footer()}</p>
		</header>
	);
}
