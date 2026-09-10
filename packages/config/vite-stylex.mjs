import babel from "@babel/core";
import stylexBabelPlugin from "@stylexjs/babel-plugin";
import stylexPostcssPlugin from "@stylexjs/postcss-plugin";

const IMPORT_SOURCE = "@stylexjs/stylex";
const SCRIPT_RE = /\.[cm]?[jt]sx?$/;

function babelConfig({ rootDir, dev }) {
	return {
		babelrc: false,
		configFile: false,
		overrides: [
			{ test: /\.ts$/, parserOpts: { plugins: ["typescript"] } },
			{
				test: /\.(?:tsx|[cm]?jsx?)$/,
				parserOpts: { plugins: ["typescript", "jsx"] },
			},
		],
		plugins: [
			[
				stylexBabelPlugin,
				{
					dev,
					runtimeInjection: false,
					unstable_moduleResolution: { type: "commonJS", rootDir },
				},
			],
		],
	};
}

export function stylex({ rootDir, include }) {
	let dev = false;

	return {
		name: "cascade:stylex",
		enforce: "pre",
		config(_config, { command }) {
			return {
				css: {
					postcss: {
						plugins: [
							stylexPostcssPlugin({
								cwd: rootDir,
								include,
								babelConfig: babelConfig({ rootDir, dev: command === "serve" }),
							}),
						],
					},
				},
			};
		},
		configResolved(config) {
			dev = config.command === "serve";
		},
		async transform(code, id) {
			const [filename] = id.split("?", 1);
			if (
				!SCRIPT_RE.test(filename) ||
				filename.includes("/node_modules/") ||
				!code.includes(IMPORT_SOURCE)
			) {
				return null;
			}

			const result = await babel.transformAsync(code, {
				...babelConfig({ rootDir, dev }),
				filename,
				sourceMaps: true,
				sourceFileName: filename,
			});

			if (!result?.code) return null;
			return { code: result.code, map: result.map };
		},
	};
}
