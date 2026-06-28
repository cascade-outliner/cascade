import type { CascadeFeature, ResolvedCascadeConfig } from "./feature";

export interface CascadeConfig {
	features: CascadeFeature[];
}

export function defineConfig(config: CascadeConfig): ResolvedCascadeConfig {
	return config;
}
