import type { ResolvedCascadeConfig } from "./feature";

/** Merge ORPC procedure maps from all features into a single flat router object */
export function assembleRouter(
	config: ResolvedCascadeConfig,
): Record<string, unknown> {
	return Object.assign({}, ...config.features.map((f) => f.procedures ?? {}));
}
