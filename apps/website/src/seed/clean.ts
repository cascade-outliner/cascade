import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Deletes every page (and its versions) so the seed starts from an empty site.
 *
 *   pnpm --filter @cascade/website seed:clean
 */
try {
	const payload = await getPayload({ config });
	const { docs } = await payload.delete({
		collection: "pages",
		where: { id: { exists: true } },
		overrideAccess: true,
	});
	payload.logger.info(`Deleted ${docs.length} page(s).`);
	process.exit(0);
} catch (error) {
	console.error(error);
	process.exit(1);
}
