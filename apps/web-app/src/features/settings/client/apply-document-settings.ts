import { fontSizeAttribute } from "@cascade/theme/font-sizes";
import { fontAttribute } from "@cascade/theme/fonts";
import {
	isDarkTheme,
	type ThemeId,
	themeAttribute,
} from "@cascade/theme/themes";

function setDataAttribute(name: string, value: string | undefined): void {
	const root = document.documentElement;
	if (value) root.dataset[name] = value;
	else delete root.dataset[name];
}

function syncThemeColorMeta(theme: ThemeId): void {
	const styles = getComputedStyle(document.documentElement);
	const property = isDarkTheme(theme) ? "--color-ink" : "--color-canvas";
	const color = styles.getPropertyValue(property).trim();
	if (!color) return;

	let meta = document.head.querySelector<HTMLMetaElement>(
		'meta[name="theme-color"]',
	);
	if (!meta) {
		meta = document.createElement("meta");
		meta.name = "theme-color";
		document.head.append(meta);
	}
	meta.content = color;
}

export function applyDocumentTheme(theme: ThemeId): void {
	document.documentElement.classList.toggle("dark", isDarkTheme(theme));
	setDataAttribute("theme", themeAttribute(theme));
	syncThemeColorMeta(theme);
}

export function applyDocumentFont(
	font: Parameters<typeof fontAttribute>[0],
): void {
	setDataAttribute("font", fontAttribute(font));
}

export function applyDocumentFontSize(
	fontSize: Parameters<typeof fontSizeAttribute>[0],
): void {
	setDataAttribute("fontSize", fontSizeAttribute(fontSize));
}
