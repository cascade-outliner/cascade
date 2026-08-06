import {
	DesktopIcon,
	DeviceMobileIcon,
	DeviceTabletIcon,
	QuestionIcon,
} from "@phosphor-icons/react/ssr";
import type { SessionDeviceType } from "@/features/sessions/model/session-display";

export function DeviceIcon({ type }: { type: SessionDeviceType }) {
	const props = { size: 20, weight: "bold" as const };
	switch (type) {
		case "desktop":
			return <DesktopIcon {...props} />;
		case "mobile":
			return <DeviceMobileIcon {...props} />;
		case "tablet":
			return <DeviceTabletIcon {...props} />;
		default:
			return <QuestionIcon {...props} />;
	}
}
