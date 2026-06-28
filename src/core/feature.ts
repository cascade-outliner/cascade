import type React from "react";
import type { AnyPgTable } from "drizzle-orm/pg-core";

export interface FeatureHooks {
	/** Called once at app startup, after all features are resolved */
	onInit?: (config: ResolvedCascadeConfig) => void | Promise<void>;
}

/**
 * Named layout slots that features can contribute React components into.
 * Add new slots here to make them available across the entire plugin system.
 */
export interface CascadeUISlots {
	/** Components rendered in the top-right corner of every page */
	topRightMenu?: React.ComponentType[];
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
	/** UI components contributed to named layout slots */
	slots?: CascadeUISlots;
}

export interface ResolvedCascadeConfig {
	features: CascadeFeature[];
}

/** Type-safe helper — not required, but gives better inference than plain object literals */
export function defineFeature(feature: CascadeFeature): CascadeFeature {
	return feature;
}
