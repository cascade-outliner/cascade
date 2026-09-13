import { darkTheme, lightTheme } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

export type ThemeMode = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "cascade.theme";

// `className` can be multiple space-separated classes, which `classList`
// methods require passed as separate arguments rather than one token.
const lightThemeClasses = (stylex.props(lightTheme).className ?? "")
	.split(" ")
	.filter(Boolean);
const darkThemeClasses = (stylex.props(darkTheme).className ?? "")
	.split(" ")
	.filter(Boolean);

// Inlined in a blocking <script> in <head> so the manual override applies
// before first paint, avoiding a flash of the wrong theme.
export const themeInitScript = `(function(){try{var m=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var cl=document.documentElement.classList;var classes=m==="light"?${JSON.stringify(lightThemeClasses)}:m==="dark"?${JSON.stringify(darkThemeClasses)}:[];classes.forEach(function(x){cl.add(x)})}catch(e){}})();`;

function isThemeMode(value: string | null): value is ThemeMode {
	return value === "system" || value === "light" || value === "dark";
}

function applyThemeClass(mode: ThemeMode): void {
	const { classList } = document.documentElement;
	classList.remove(...lightThemeClasses, ...darkThemeClasses);
	if (mode === "light") {
		classList.add(...lightThemeClasses);
	} else if (mode === "dark") {
		classList.add(...darkThemeClasses);
	}
}

const ThemeContext = createContext<{
	mode: ThemeMode;
	setMode: (mode: ThemeMode) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [mode, setModeState] = useState<ThemeMode>("system");

	useEffect(() => {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		if (isThemeMode(stored)) {
			setModeState(stored);
		}
	}, []);

	useEffect(() => {
		applyThemeClass(mode);
	}, [mode]);

	const setMode = useCallback((next: ThemeMode) => {
		setModeState(next);
		localStorage.setItem(THEME_STORAGE_KEY, next);
	}, []);

	return (
		<ThemeContext.Provider value={{ mode, setMode }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme(): {
	mode: ThemeMode;
	setMode: (mode: ThemeMode) => void;
} {
	const ctx = useContext(ThemeContext);
	if (!ctx) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return ctx;
}
