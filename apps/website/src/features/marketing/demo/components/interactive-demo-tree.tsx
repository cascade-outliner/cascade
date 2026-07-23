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
							className="relative z-0 after:absolute after:-inset-2 w-2 h-2 rounded-full bg-ink hover:bg-danger shrink-0 hover:scale-150 hover:-z-10 transition-all ease-in-out"
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

function DemoTreeSkeleton() {
	return <div aria-hidden className={`${demoTreeClassName} animate-pulse`} />;
}
