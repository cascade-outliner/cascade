import { authed } from "@/orpc/context";
import { ensureOnboardingSampleTree } from "../ensure-sample-tree";

/** Adds back whatever the onboarding tour needs to run fully (see
 * `ensureOnboardingSampleTree`) and marks the tour as not completed, so the
 * client can start it once the settings dialog closes. */
export const replayOnboardingTour = authed.handler(async ({ context }) => {
	return ensureOnboardingSampleTree(context.user.id);
});
