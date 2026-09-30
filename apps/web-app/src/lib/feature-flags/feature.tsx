import type { ReactNode } from "react";
import { useFeatureFlag } from "./index.ts";
import type { FeatureFlagKey } from "./registry.ts";

export interface FeatureProps {
	flag: FeatureFlagKey;
	children: ReactNode;
	fallback?: ReactNode;
}

export function Feature({ flag, children, fallback = null }: FeatureProps) {
	return useFeatureFlag(flag) ? children : fallback;
}
