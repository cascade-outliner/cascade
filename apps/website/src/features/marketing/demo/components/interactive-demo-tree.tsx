import { lazy, Suspense, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { useDemoTree } from "../hooks/use-demo-tree";
import { DemoBreadcrumbs } from "./demo-breadcrumbs";

const VirtualTree = lazy(() =>
	import("@cascade/outliner/virtual-tree").then((module) => ({
		default: module.VirtualTree,
	})),
);

const demoTreeClassName =
	"mt-10 h-[420px] overflow-auto rounded-2xl border border-ink/10 bg-white text-left shadow-lg shadow-ink/10";

export function InteractiveDemoTree() {
	const [rootId, setRootId] = useState<string | null>(null);
	const tree = useDemoTree(rootId);

	return (
		<>
			<Suspense fallback={<DemoTreeSkeleton />}>
				<VirtualTree
					tree={tree}
					indentSize={16}
					renderNodeLink={({ id }) => (
						<button
							type="button"
							aria-label={m.hero_demo_open_node()}
							onClick={() => setRootId(id)}
							className="relative z-0 after:absolute after:-inset-2 size-2 shrink-0 rounded-full bg-ink transition-colors duration-small-enter ease-standard hover:bg-danger"
						/>
					)}
					header={
						rootId === null ? undefined : (
							<DemoBreadcrumbs
								ancestors={tree.ancestors}
								onNavigate={setRootId}
							/>
						)
					}
					className={demoTreeClassName}
					contentClassName="max-w-none mx-0 px-6 py-6"
				/>
			</Suspense>
			<p className="mt-3 text-xs text-muted">{m.hero_demo_footer()}</p>
		</>
	);
}

export function DemoTreeSkeleton() {
	return (
		<div
			role="status"
			aria-label={m.hero_demo_loading()}
			className={`${demoTreeClassName} animate-pulse motion-reduce:animate-none p-6`}
		>
			<div aria-hidden className="space-y-5">
				<div className="h-4 w-2/5 rounded bg-ink/10" />
				<div className="ml-4 h-4 w-3/5 rounded bg-ink/10" />
				<div className="ml-8 h-4 w-1/2 rounded bg-ink/10" />
				<div className="ml-4 h-4 w-4/5 rounded bg-ink/10" />
				<div className="h-4 w-1/3 rounded bg-ink/10" />
			</div>
		</div>
	);
}
