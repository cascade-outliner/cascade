// @cascade/auth's env.ts validates BETTER_AUTH_URL/BETTER_AUTH_SECRET at
// module-import time, so anything that transitively imports createAuth
// (e.g. modules/auth/auth.provider.ts) needs them present before that
// import happens. Only fill in dummy defaults when unset, so a real
// .env.local (if present) still wins.
process.env.BETTER_AUTH_URL ??= "http://localhost:3002";
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-32";
