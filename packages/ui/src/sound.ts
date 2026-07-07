const DEFAULT_VOLUME = 0.4;
const COOLDOWN_MS = 70;

interface SoundManagerOptions {
	volume?: number;
}

/**
 * Generic, SSR-safe short-sound-effect player. Preloads one `<audio>` element
 * per key, then plays a `cloneNode()` of it on each `play()` call so
 * overlapping/rapid triggers of the same sound don't cut each other off.
 */
export function createSoundManager<K extends string>(
	sounds: Record<K, string>,
	options: SoundManagerOptions = {},
) {
	const volume = options.volume ?? DEFAULT_VOLUME;

	const elements =
		typeof Audio === "undefined"
			? null
			: (Object.fromEntries(
					Object.entries(sounds).map(([key, src]) => {
						const audio = new Audio(src as string);
						audio.preload = "auto";
						audio.volume = volume;
						return [key, audio];
					}),
				) as Record<K, HTMLAudioElement>);

	const lastPlayedAt: Partial<Record<K, number>> = {};
	let enabled = true;

	return {
		play(key: K) {
			if (!enabled || !elements) return;

			const now = Date.now();
			if (now - (lastPlayedAt[key] ?? 0) < COOLDOWN_MS) return;
			lastPlayedAt[key] = now;

			const clone = elements[key].cloneNode(true) as HTMLAudioElement;
			clone.volume = volume;
			// Autoplay is fine here: every call site fires from a user gesture.
			clone.play().catch(() => {});
		},
		setEnabled(next: boolean) {
			enabled = next;
		},
	};
}
