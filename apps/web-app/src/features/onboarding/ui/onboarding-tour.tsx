import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useEffect, useRef } from "react";
import { m } from "#/paraglide/messages.js";
import { useSettings } from "@/features/settings/client/settings-context";
import { onboardingSteps } from "../model/onboarding-steps";

/**
 * Mounted once in the authed app shell. Starts the driver.js tour whenever
 * `settings.onboardingCompleted` is `false` — true for a brand-new signup
 * (see `seedOnboardingContent`) or after "Replay onboarding tour" in
 * Settings resets the flag — and persists completion the moment the tour
 * ends, however it ends (finished, closed, or navigated away from), so it
 * never reappears unprompted afterwards.
 */
export function OnboardingTour() {
	const { settings, setSetting, saveSettings } = useSettings();
	const activeRef = useRef(false);
	// Kept in a ref (rather than the effect's deps) since `setSetting` and
	// `saveSettings` are new function identities every render, and including
	// them would restart the tour mid-flight on every settings change.
	const completeRef = useRef(() => {});
	completeRef.current = () => {
		setSetting("onboardingCompleted", true);
		saveSettings();
	};

	useEffect(() => {
		if (settings.onboardingCompleted) {
			activeRef.current = false;
			return;
		}
		if (activeRef.current) return;
		activeRef.current = true;

		const tour = driver({
			showProgress: true,
			allowClose: true,
			overlayClickBehavior: "close",
			skipMissingElement: true,
			waitForElement: 2000,
			nextBtnText: m.onboarding_tour_next(),
			prevBtnText: m.onboarding_tour_previous(),
			doneBtnText: m.onboarding_tour_done(),
			steps: onboardingSteps(),
			onDestroyed: () => completeRef.current(),
		});

		tour.drive();

		return () => {
			tour.destroy();
		};
	}, [settings.onboardingCompleted]);

	return null;
}
