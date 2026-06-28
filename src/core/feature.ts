import type { AnyPgTable } from "drizzle-orm/pg-core";

export interface FeatureHooks {
	/** Called once at app startup, after all features are resolved */
	onInit?: (config: ResolvedCascadeConfig) => void | Promise<void>;
}

export interface CascadeFeature {
	/** Unique identifier for this feature */
	name: string;
	/** Human-readable description */
	description?: string;
	/** Drizzle table definitions contributed by this feature */
	schema?: Record<string, AnyPgTable>;
	/** ORPC procedures contributed to the top-level router */
	procedures?: Record<string, unknown>;
	/** Feature names this feature depends on (validated at startup) */
	dependencies?: string[];
	/** Lifecycle hooks */
	hooks?: FeatureHooks;
}

export interface ResolvedCascadeConfig {
	features: CascadeFeature[];
}

/** Type-safe helper — not required, but gives better inference than plain object literals */
export function defineFeature(feature: CascadeFeature): CascadeFeature {
	return feature;
}
