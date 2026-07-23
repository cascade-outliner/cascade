import { readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://cascadelist.com";
const routesDir = fileURLToPath(new URL("../src/routes", import.meta.url));
const outFile = fileURLToPath(new URL("../public/sitemap.xml", import.meta.url));

const paths = readdirSync(routesDir)
	.filter((file) => file.endsWith(".tsx") && file !== "__root.tsx")
	.map((file) => file.replace(/\.tsx$/, ""))
	.map((name) => (name === "index" ? "/" : `/${name}`))
	.sort();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `\t<url>\n\t\t<loc>${SITE_URL}${path}</loc>\n\t</url>`).join("\n")}
</urlset>
`;

writeFileSync(outFile, xml);
console.log(`Generated sitemap.xml with ${paths.length} routes`);
