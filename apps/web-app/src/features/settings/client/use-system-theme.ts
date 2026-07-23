import { useEffect, useState } from "react";

const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";

function systemPrefersDark(): boolean {
	return (
		typeof matchMedia !== "undefined" && matchMedia(DARK_MODE_QUERY).matches
	);
}

export function useSystemPrefersDark(): boolean {
	const [prefersDark, setPrefersDark] = useState(systemPrefersDark);

	useEffect(() => {
		if (typeof matchMedia === "undefined") return;
		const media = matchMedia(DARK_MODE_QUERY);
		const updatePreference = () => setPrefersDark(media.matches);
		media.addEventListener("change", updatePreference);
		return () => media.removeEventListener("change", updatePreference);
	}, []);

	return prefersDark;
}
