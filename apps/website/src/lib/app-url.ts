export const appUrl =
	import.meta.env.VITE_APP_URL ?? "https://app.cascadelist.com/";

export const appLoginUrl = new URL("/login", appUrl).toString();
export const appRegisterUrl = new URL("/register", appUrl).toString();
