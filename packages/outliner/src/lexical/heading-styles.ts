export type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

/** Shared by the read view and Lexical's editing theme to avoid a visual jump. */
export const HEADING_CLASSES = {
	h1: "text-4xl font-bold",
	h2: "text-3xl font-bold",
	h3: "text-2xl font-bold",
	h4: "text-xl font-bold",
	h5: "text-lg font-bold",
	h6: "text-base font-bold",
} satisfies Record<HeadingTag, string>;
