export interface FeatureFlagDefinition {
	label: string;
	description: string;
	defaultValue: boolean;
	needsServer?: boolean;
}

export const FEATURE_FLAGS = {
	aiSplit: {
		label: "Split into tasks with AI",
		description:
			"Break a line into a checklist of tasks from the capture bar, the context menu or the slash menu.",
		defaultValue: true,
		needsServer: true,
	},
	slashCommands: {
		label: "Slash commands",
		description:
			"Type / in a line or the capture bar for quick actions like due dates and tasks.",
		defaultValue: true,
	},
	dueElsewhere: {
		label: "Due elsewhere",
		description:
			"Show tasks due today and tomorrow from other pages at the bottom of today's note.",
		defaultValue: true,
	},
} as const satisfies Record<string, FeatureFlagDefinition>;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export const FEATURE_FLAG_KEYS = Object.keys(FEATURE_FLAGS) as FeatureFlagKey[];

export function isFeatureFlagKey(key: string): key is FeatureFlagKey {
	return Object.hasOwn(FEATURE_FLAGS, key);
}

export function featureFlagEnvName(key: FeatureFlagKey): string {
	return `FEATURE_${key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase()}`;
}

export interface ServerFlag {
	value: boolean;
	reason: string;
}

export type ServerFlags = Record<FeatureFlagKey, ServerFlag | null>;

export type FeatureFlagOverrides = Partial<Record<FeatureFlagKey, boolean>>;
