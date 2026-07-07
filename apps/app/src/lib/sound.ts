import { createSoundManager } from "@cascade/ui/sound";

export const sound = createSoundManager({
	click: "/sounds/click.wav",
	success: "/sounds/success.wav",
	error: "/sounds/error.wav",
	complete: "/sounds/complete.wav",
	pickup: "/sounds/pickup.wav",
	drop: "/sounds/drop.wav",
});
