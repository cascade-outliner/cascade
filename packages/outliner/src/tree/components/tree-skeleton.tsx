import { useUiLabels } from "@cascade/ui/labels-context";

/** Matches `estimateSize` in `use-tree-virtualizer.ts`, so real rows swap in with minimal layout jump. */
const ROW_HEIGHT = 36;
const DEFAULT_INDENT_SIZE = 16;

/** A hand-picked depth/width pattern so this reads as "an outline", not a generic list. */
const SKELETON_ROWS: { depth: number; width: number }[] = [
	{ depth: 0, width: 62 },
	{ depth: 1, width: 78 },
	{ depth: 1, width: 45 },
	{ depth: 2, width: 55 },
	{ depth: 1, width: 70 },
	{ depth: 0, width: 50 },
	{ depth: 1, width: 82 },
	{ depth: 2, width: 60 },
	{ depth: 2, width: 40 },
	{ depth: 1, width: 65 },
	{ depth: 0, width: 55 },
	{ depth: 1, width: 72 },
	{ depth: 2, width: 48 },
	{ depth: 0, width: 60 },
];

/**
 * A tree-shaped placeholder shown while `visibleTree` loads, in place of the
 * generic `CascadeLoader` spinner. Purely decorative rows are `aria-hidden`;
 * the container itself carries the loading announcement.
 */
export function TreeSkeleton({
	indentSize = DEFAULT_INDENT_SIZE,
}: {
	indentSize?: number;
}) {
	const labels = useUiLabels();

	return (
		<div
			role="status"
			aria-label={labels.loading}
			className="flex h-screen w-full flex-col overflow-hidden"
		>
			{SKELETON_ROWS.map((row) => (
				<div
					key={`${row.depth}-${row.width}`}
					aria-hidden="true"
					className="flex shrink-0 items-center gap-2 px-3 animate-pulse motion-reduce:animate-none"
					style={{
						height: ROW_HEIGHT,
						paddingLeft: row.depth * indentSize + 12,
					}}
				>
					<span className="h-3.5 w-3.5 shrink-0 rounded-sm bg-ink/10" />
					<span
						className="h-3 max-w-80 rounded-full bg-ink/10"
						style={{ width: `${row.width}%` }}
					/>
				</div>
			))}
		</div>
	);
}
