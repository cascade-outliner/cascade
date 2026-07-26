import Bowser from "bowser";

export type SessionDeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export interface SessionDevice {
	browser: string | null;
	os: string | null;
	type: SessionDeviceType;
}

export function parseSessionDevice(userAgent: string | null): SessionDevice {
	if (!userAgent) {
		return { browser: null, os: null, type: "unknown" };
	}

	const parsed = Bowser.parse(userAgent);
	const platformType = parsed.platform.type;
	const type: SessionDeviceType =
		platformType === "desktop" ||
		platformType === "mobile" ||
		platformType === "tablet"
			? platformType
			: "unknown";

	return {
		browser: parsed.browser.name ?? null,
		os: parsed.os.name ?? parsed.platform.model ?? null,
		type,
	};
}

export function formatSessionActivity(
	updatedAt: Date,
	locale: string,
	now = new Date(),
): string {
	const elapsed = Math.max(0, now.getTime() - updatedAt.getTime());
	const daysAgo = Math.floor(elapsed / (24 * 60 * 60 * 1000));
	return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
		-daysAgo,
		"day",
	);
}
