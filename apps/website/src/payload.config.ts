import path from "node:path";
import { fileURLToPath } from "node:url";
import { websiteEnv } from "@cascade/env/website";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";
import { blocks } from "@/blocks";
import { collections } from "@/collections";
import { globals } from "@/globals";
import { plugins } from "@/plugins";
import { Users } from "./collections/Users";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
	admin: {
		user: Users.slug,
		importMap: {
			baseDir: path.resolve(dirname),
		},
	},
	graphQL: {
		disable: true,
	},
	blocks,
	collections,
	globals,
	editor: lexicalEditor(),
	secret: websiteEnv.PAYLOAD_SECRET,
	typescript: {
		outputFile: path.resolve(dirname, "payload-types.ts"),
	},
	db: postgresAdapter({
		pool: {
			connectionString: websiteEnv.DATABASE_URL_WEBSITE,
		},
	}),
	sharp,
	localization: {
		locales: ["en", "nl"],
		fallback: false,
		defaultLocale: "en",
	},
	plugins,
});
