import configPromise from "@payload-config";
import { type DataFromGlobalSlug, getPayload } from "payload";
import type { Config } from "@/payload-types";

type Global = keyof Config["globals"];

async function getGlobal<T extends Global>(
	slug: T,
	depth = 0,
): Promise<DataFromGlobalSlug<T>> {
	const payload = await getPayload({ config: configPromise });

	const global = await payload.findGlobal({
		slug,
		depth,
	});

	return global;
}

export const getCachedGlobal =
	<T extends Global>(slug: T, depth = 0) =>
	() =>
		getGlobal<T>(slug, depth);
