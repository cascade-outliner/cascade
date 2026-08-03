import type { FontSizeId } from "@cascade/theme/font-sizes";
import type { FontId } from "@cascade/theme/fonts";
import type { ThemeId } from "@cascade/theme/themes";
import { useEffect } from "react";
import {
	applyDocumentFont,
	applyDocumentFontSize,
	applyDocumentTheme,
} from "./apply-document-settings";

export function useDocumentThemeEffects(
	resolvedTheme: ThemeId,
	font: FontId,
	fontSize: FontSizeId,
) {
	useEffect(() => {
		applyDocumentTheme(resolvedTheme);
	}, [resolvedTheme]);

	useEffect(() => {
		applyDocumentFont(font);
	}, [font]);

	useEffect(() => {
		applyDocumentFontSize(fontSize);
	}, [fontSize]);
}
