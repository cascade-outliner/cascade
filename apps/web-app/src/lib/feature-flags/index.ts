import { IdbPreferences } from "@cascade/data";
import { useSyncExternalStore } from "react";
import { cascadeDb } from "#/lib/db.ts";
import type { FeatureFlagKey } from "./registry.ts";
import type { ResolvedFlag, ResolvedFlags } from "./resolve.ts";
import { createFeatureFlagStore, type FeatureFlagStore } from "./store.ts";

export {
	FEATURE_FLAG_KEYS,
	FEATURE_FLAGS,
	type FeatureFlagDefinition,
	type FeatureFlagKey,
	featureFlagEnvName,
	type ServerFlag,
	type ServerFlags,
} from "./registry.ts";
export type {
	FeatureFlagSource,
	ResolvedFlag,
	ResolvedFlags,
} from "./resolve.ts";
export type { FeatureFlagStore } from "./store.ts";

let instance: FeatureFlagStore | undefined;

export function featureFlags(): FeatureFlagStore {
	instance ??= createFeatureFlagStore(
		new IdbPreferences(undefined, cascadeDb()),
	);
	return instance;
}

export function useFeatureFlags(): ResolvedFlags {
	const store = featureFlags();
	return useSyncExternalStore(
		store.subscribe,
		store.getSnapshot,
		store.getSnapshot,
	);
}

export function useResolvedFeatureFlag(key: FeatureFlagKey): ResolvedFlag {
	return useFeatureFlags()[key];
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
	return useResolvedFeatureFlag(key).enabled;
}

export function useHasFeatureFlagOverrides(): boolean {
	const store = featureFlags();
	return useSyncExternalStore(
		store.subscribe,
		store.hasOverrides,
		store.hasOverrides,
	);
}
