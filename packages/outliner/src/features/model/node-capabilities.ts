export const nodeCapabilityIds = [
	"icon",
	"color",
	"task",
	"due-date",
	"recurrence",
	"priority",
	"tags",
	"board",
	"status",
	"paragraph",
	"heading-1",
	"heading-2",
	"heading-3",
	"heading-4",
	"heading-5",
	"heading-6",
	"search",
	"duplicate",
] as const;

export type NodeCapabilityId = (typeof nodeCapabilityIds)[number];

export const minimalNodeCapabilities = [
	"paragraph",
	"task",
	"duplicate",
] as const satisfies readonly NodeCapabilityId[];

export const nodeCapabilityDependencies: Partial<
	Record<NodeCapabilityId, readonly NodeCapabilityId[]>
> = {
	recurrence: ["due-date", "task"],
	status: ["board"],
};

export const allNodeCapabilities = new Set<NodeCapabilityId>(nodeCapabilityIds);

const featureCapabilityIds = new Set<NodeCapabilityId>([
	"icon",
	"color",
	"task",
	"due-date",
	"priority",
	"status",
	"tags",
]);

export function resolveNodeCapabilities(
	ids: Iterable<NodeCapabilityId>,
): NodeCapabilityId[] {
	const enabled = new Set<NodeCapabilityId>(["paragraph", ...ids]);
	let changed = true;
	while (changed) {
		changed = false;
		for (const id of enabled) {
			for (const dependency of nodeCapabilityDependencies[id] ?? []) {
				if (enabled.has(dependency)) continue;
				enabled.add(dependency);
				changed = true;
			}
		}
	}
	return nodeCapabilityIds.filter((id) => enabled.has(id));
}

export function toggleNodeCapability(
	current: Iterable<NodeCapabilityId>,
	id: NodeCapabilityId,
	enabled: boolean,
): NodeCapabilityId[] {
	if (id === "paragraph" && !enabled) {
		return resolveNodeCapabilities(current);
	}
	const next = new Set(current);
	if (enabled) {
		next.add(id);
		return resolveNodeCapabilities(next);
	}

	next.delete(id);
	let changed = true;
	while (changed) {
		changed = false;
		for (const candidate of next) {
			if (
				(nodeCapabilityDependencies[candidate] ?? []).some(
					(dependency) => !next.has(dependency),
				)
			) {
				next.delete(candidate);
				changed = true;
			}
		}
	}
	return nodeCapabilityIds.filter((candidate) => next.has(candidate));
}

export function blockTypeCapability(
	blockType: "paragraph" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6",
): NodeCapabilityId {
	return blockType === "paragraph"
		? "paragraph"
		: (`heading-${blockType.slice(1)}` as NodeCapabilityId);
}

export function capabilityFeatureIds(
	enabled: ReadonlySet<NodeCapabilityId>,
): ReadonlySet<NodeCapabilityId> {
	return new Set(
		nodeCapabilityIds.filter(
			(id) => featureCapabilityIds.has(id) && enabled.has(id),
		),
	);
}
