/**
 * pnpm forwards a literal `--` into the script's argv when passing extra
 * flags through a package.json script (e.g. `pnpm a11y:report -- --out=foo`),
 * which node:util's `parseArgs` then rejects as an unexpected positional.
 * Strip it so both that form and a plain `node script.ts --out=foo` work.
 */
export function cliArgs(): string[] {
	const argv = process.argv.slice(2);
	return argv[0] === "--" ? argv.slice(1) : argv;
}
