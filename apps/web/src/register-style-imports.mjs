import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import ts from "typescript";

const styleExtensions = new Set([".css", ".scss", ".sass", ".less", ".styl"]);
const scriptExtensions = new Set([".ts", ".tsx", ".mts", ".cts"]);

registerHooks({
	load(url, context, nextLoad) {
		const pathname = new URL(url).pathname;

		for (const extension of styleExtensions) {
			if (pathname.endsWith(extension)) {
				return {
					format: "module",
					shortCircuit: true,
					source: "export default {};\n",
				};
			}
		}

		if (pathname.includes(`${path.sep}node_modules${path.sep}`)) {
			for (const extension of scriptExtensions) {
				if (pathname.endsWith(extension)) {
					const sourceText = fs.readFileSync(new URL(url), "utf8");
					const transpiled = ts.transpileModule(sourceText, {
						compilerOptions: {
							jsx: ts.JsxEmit.ReactJSX,
							module: ts.ModuleKind.ESNext,
							target: ts.ScriptTarget.ES2022,
						},
						fileName: pathname,
					});

					return {
						format: "module",
						shortCircuit: true,
						source: transpiled.outputText,
					};
				}
			}
		}

		return nextLoad(url, context);
	},
});
