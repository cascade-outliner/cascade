import path from "node:path";
import { fileURLToPath } from "node:url";
import { websiteEnv } from "@cascade/env/website";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { mcpPlugin } from "@payloadcms/plugin-mcp";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";
import { Folders } from "./collections/Folders";
import { Media } from "./collections/Media";
import { Tags } from "./collections/Tags";
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
	collections: [Users, Media, Folders, Tags],
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
		locales: ["en"],
		fallback: true,
		defaultLocale: "en",
	},
	plugins: [mcpPlugin({})],
});
