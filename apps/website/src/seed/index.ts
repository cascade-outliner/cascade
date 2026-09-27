import config from "@payload-config";
import { getPayload } from "payload";
import { HOME_SLUG } from "../lib/site";
import { footerSeed, headerSeed, homeSeed } from "./home";

/**
 * Fills an empty site with the launch content: header, footer and the home page.
 * Existing content is left alone unless `--force` is passed.
 *
 *   pnpm --filter @cascade/website seed
 *   pnpm --filter @cascade/website seed --force
 */
async function seed() {
	const force = process.argv.includes("--force");
	const payload = await getPayload({ config });

	const existing = await payload.find({
		collection: "pages",
		where: { slug: { equals: HOME_SLUG } },
		limit: 1,
		pagination: false,
	});
	const home = existing.docs[0];

	if (home && !force) {
		payload.logger.info("Home page already exists; pass --force to overwrite.");
		return;
	}

	await payload.updateGlobal({
		slug: "header",
		data: headerSeed,
		overrideAccess: true,
	});
	await payload.updateGlobal({
		slug: "footer",
		data: footerSeed,
		overrideAccess: true,
	});

	if (home) {
		await payload.update({
			collection: "pages",
			id: home.id,
			data: homeSeed,
			overrideAccess: true,
		});
		payload.logger.info(`Updated page “${homeSeed.title}” (/).`);
	} else {
		await payload.create({
			collection: "pages",
			data: homeSeed,
			overrideAccess: true,
		});
		payload.logger.info(`Created page “${homeSeed.title}” (/).`);
	}
}

try {
	await seed();
	process.exit(0);
} catch (error) {
	console.error(error);
	process.exit(1);
}
