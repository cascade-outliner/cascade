/**
 * pnpm forwards a literal `--` into the script's argv when passing extra
 * flags through a package.json script (e.g. `pnpm perf:seed -- --count=5000`),
 * which node:util's `parseArgs` then rejects as an unexpected positional.
 * Strip it so both that form and a plain `node script.ts --count=5000` work.
 */
export function cliArgs(): string[] {
	const argv = process.argv.slice(2);
	return argv[0] === "--" ? argv.slice(1) : argv;
}
