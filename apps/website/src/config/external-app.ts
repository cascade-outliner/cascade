const externalAppUrl =
	import.meta.env.VITE_APP_URL ?? "https://app.cascadelist.com/";

export const externalAppUrls = {
	login: new URL("/login", externalAppUrl).toString(),
	register: new URL("/register", externalAppUrl).toString(),
} as const;
