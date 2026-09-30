import {
	FEATURE_FLAG_KEYS,
	FEATURE_FLAGS,
	type FeatureFlagDefinition,
	type FeatureFlagKey,
	type FeatureFlagOverrides,
	type ServerFlags,
} from "./registry.ts";

export type FeatureFlagSource = "server" | "user" | "default";

export interface ResolvedFlag {
	key: FeatureFlagKey;
	enabled: boolean;
	source: FeatureFlagSource;
	locked: boolean;
	reason?: string;
}

export type ResolvedFlags = Record<FeatureFlagKey, ResolvedFlag>;

export const SERVER_UNREACHABLE = "Could not reach the server";

export function resolveFeatureFlag(
	key: FeatureFlagKey,
	server: ServerFlags | null,
	overrides: FeatureFlagOverrides,
): ResolvedFlag {
	const definition: FeatureFlagDefinition = FEATURE_FLAGS[key];
	const pinned = server?.[key];
	if (pinned) {
		return {
			key,
			enabled: pinned.value,
			source: "server",
			locked: true,
			reason: pinned.reason,
		};
	}
	if (server === null && definition.needsServer) {
		return {
			key,
			enabled: false,
			source: "server",
			locked: true,
			reason: SERVER_UNREACHABLE,
		};
	}
	const override = overrides[key];
	if (override !== undefined) {
		return { key, enabled: override, source: "user", locked: false };
	}
	return {
		key,
		enabled: definition.defaultValue,
		source: "default",
		locked: false,
	};
}

export function resolveFeatureFlags(
	server: ServerFlags | null,
	overrides: FeatureFlagOverrides,
): ResolvedFlags {
	const resolved = {} as ResolvedFlags;
	for (const key of FEATURE_FLAG_KEYS) {
		resolved[key] = resolveFeatureFlag(key, server, overrides);
	}
	return resolved;
}
