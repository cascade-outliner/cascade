import { createServerFn } from "@tanstack/react-start";
import {
	FEATURE_FLAG_KEYS,
	type FeatureFlagKey,
	featureFlagEnvName,
	type ServerFlag,
	type ServerFlags,
} from "#/lib/feature-flags/registry.ts";

const ON = new Set(["1", "true", "on", "yes"]);
const OFF = new Set(["0", "false", "off", "no"]);

const capabilities: Partial<Record<FeatureFlagKey, () => string | null>> = {
	aiSplit: () =>
		process.env.ANTHROPIC_API_KEY
			? null
			: "ANTHROPIC_API_KEY is not set on the server",
};

function fromEnv(key: FeatureFlagKey): ServerFlag | null {
	const name = featureFlagEnvName(key);
	const raw = process.env[name]?.trim().toLowerCase();
	if (!raw) return null;
	if (ON.has(raw)) return { value: true, reason: `Turned on by ${name}` };
	if (OFF.has(raw)) return { value: false, reason: `Turned off by ${name}` };
	console.warn(
		`Feature flags: ignoring ${name}="${raw}"; use one of on, off, true, false, 1, 0`,
	);
	return null;
}

export function resolveServerFlags(): ServerFlags {
	const flags = {} as ServerFlags;
	for (const key of FEATURE_FLAG_KEYS) {
		const missing = capabilities[key]?.();
		flags[key] = missing ? { value: false, reason: missing } : fromEnv(key);
	}
	return flags;
}

export const getFeatureFlags = createServerFn({ method: "GET" }).handler(
	async (): Promise<ServerFlags> => resolveServerFlags(),
);
