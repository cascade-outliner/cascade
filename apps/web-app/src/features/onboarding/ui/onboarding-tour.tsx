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
	// `useSettings`' `setSetting` only queues a local state update; calling
	// `saveSettings` right after in the same tick would still see the
	// pre-update state (it reads a closed-over variable, not a ref) and send
	// an empty patch, so the "completed" flag never reached the server and
	// the tour restarted on every reload. Deferring the save to the *next*
	// render's effect — by which point `saveSettings` closes over the
	// already-updated state — fixes that.
	const pendingSaveRef = useRef(false);

	// Read via refs (rather than the effect's deps) so the tour, once
	// started, isn't restarted mid-flight by unrelated settings re-renders.
	const setSettingRef = useRef(setSetting);
	setSettingRef.current = setSetting;
	const sampleNodeIdsRef = useRef(settings.onboardingSampleNodeIds);
	sampleNodeIdsRef.current = settings.onboardingSampleNodeIds;

	useEffect(() => {
		if (pendingSaveRef.current) {
			pendingSaveRef.current = false;
			saveSettings();
		}
	});

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
			steps: onboardingSteps(sampleNodeIdsRef.current),
			onDestroyed: () => {
				setSettingRef.current("onboardingCompleted", true);
				pendingSaveRef.current = true;
			},
		});

		tour.drive();

		return () => {
			tour.destroy();
		};
	}, [settings.onboardingCompleted]);

	return null;
}
