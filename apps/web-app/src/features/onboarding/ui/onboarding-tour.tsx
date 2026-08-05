import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./onboarding-tour.css";
import { useEffect, useRef } from "react";
import { m } from "#/paraglide/messages.js";
import { useSettings } from "@/features/settings/client/settings-context";
import { onboardingSteps } from "../model/onboarding-steps";

export function OnboardingTour() {
	const { settings, setSetting, saveSettings } = useSettings();
	const activeRef = useRef(false);
	const pendingSaveRef = useRef(false);
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
			onNextClick: () => {
				if (tour.isLastStep()) tour.destroy();
				else tour.moveNext();
			},
			onPrevClick: () => tour.movePrevious(),
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
