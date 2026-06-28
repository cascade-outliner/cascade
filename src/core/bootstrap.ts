import config from "../../cascade.config";

let bootstrapped = false;

/**
 * Run onInit hooks for all features. Safe to call multiple times — only executes once.
 * Call this at server startup before handling requests.
 */
export async function bootstrap(): Promise<void> {
	if (bootstrapped) return;
	bootstrapped = true;

	for (const feature of config.features) {
		await feature.hooks?.onInit?.(config);
	}
}
