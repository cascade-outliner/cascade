import type { Preferences } from "@cascade/data";
import { z } from "zod";
import {
	type FeatureFlagKey,
	type FeatureFlagOverrides,
	isFeatureFlagKey,
	type ServerFlags,
} from "./registry.ts";
import { type ResolvedFlags, resolveFeatureFlags } from "./resolve.ts";

export const PREFERENCE_KEY = "featureFlags";

const storedSchema = z.record(z.string(), z.boolean());

// TODO: a settings UI will drive setOverride/resetOverrides and render getSnapshot (locked + reason per flag).
export interface FeatureFlagStore {
	subscribe(listener: () => void): () => void;
	getSnapshot(): ResolvedFlags;
	hasOverrides(): boolean;
	load(): Promise<void>;
	setServerFlags(flags: ServerFlags | null): void;
	setOverride(key: FeatureFlagKey, value: boolean | undefined): Promise<void>;
	resetOverrides(): Promise<void>;
}

function parseOverrides(stored: unknown): FeatureFlagOverrides {
	const parsed = storedSchema.safeParse(stored);
	if (!parsed.success) return {};
	const overrides: FeatureFlagOverrides = {};
	for (const [key, value] of Object.entries(parsed.data)) {
		if (isFeatureFlagKey(key)) overrides[key] = value;
	}
	return overrides;
}

export function createFeatureFlagStore(
	preferences: Preferences,
): FeatureFlagStore {
	const listeners = new Set<() => void>();
	let server: ServerFlags | null = null;
	let overrides: FeatureFlagOverrides = {};
	let snapshot = resolveFeatureFlags(server, overrides);
	let loading: Promise<void> | undefined;

	const emit = () => {
		snapshot = resolveFeatureFlags(server, overrides);
		for (const listener of listeners) listener();
	};

	const read = async () => {
		try {
			overrides = parseOverrides(await preferences.get(PREFERENCE_KEY));
		} catch (error) {
			console.error("Feature flags: could not read overrides", error);
			overrides = {};
		}
		emit();
	};

	const write = async (next: FeatureFlagOverrides) => {
		overrides = next;
		emit();
		try {
			if (Object.keys(next).length === 0) {
				await preferences.remove(PREFERENCE_KEY);
			} else {
				await preferences.set(PREFERENCE_KEY, next);
			}
		} catch (error) {
			console.error("Feature flags: could not save overrides", error);
		}
	};

	const onRemoteChange = (key: string) => {
		if (key === PREFERENCE_KEY) void read();
	};

	return {
		subscribe(listener) {
			listeners.add(listener);
			const unsubscribe =
				listeners.size === 1 ? preferences.subscribe(onRemoteChange) : null;
			return () => {
				listeners.delete(listener);
				unsubscribe?.();
			};
		},
		getSnapshot: () => snapshot,
		hasOverrides: () => Object.keys(overrides).length > 0,
		load() {
			loading ??= read();
			return loading;
		},
		setServerFlags(flags) {
			server = flags;
			emit();
		},
		setOverride(key, value) {
			const next = { ...overrides };
			if (value === undefined) {
				delete next[key];
			} else {
				next[key] = value;
			}
			return write(next);
		},
		resetOverrides() {
			return write({});
		},
	};
}
