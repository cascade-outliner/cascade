/** Triggers a browser download of in-memory text content, e.g. a tree export. */
export function downloadTextFile(
	filename: string,
	content: string,
	mimeType: string,
): void {
	const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}
