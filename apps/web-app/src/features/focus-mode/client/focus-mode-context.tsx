import {
	createContext,
	type ReactNode,
	use,
	useCallback,
	useState,
} from "react";

const FocusModeContext = createContext<{
	focusMode: boolean;
	toggleFocusMode: () => void;
} | null>(null);

/** Transient, session-only UI state — not persisted across reloads or synced
 * to the server, unlike `SettingsContext`. */
export function FocusModeProvider({ children }: { children: ReactNode }) {
	const [focusMode, setFocusMode] = useState(false);
	const toggleFocusMode = useCallback(() => setFocusMode((prev) => !prev), []);

	return (
		<FocusModeContext value={{ focusMode, toggleFocusMode }}>
			{children}
		</FocusModeContext>
	);
}

export function useFocusMode() {
	const ctx = use(FocusModeContext);
	if (!ctx) {
		throw new Error("useFocusMode must be used within FocusModeProvider");
	}
	return ctx;
}
