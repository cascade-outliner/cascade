export interface SlashTriggerMatch {
	/** What was typed after the trigger. */
	query: string;
	/** Where the trigger sits in the text. */
	index: number;
}

/**
 * Finds a trigger at the end of `text`, at the start or after a space, with
 * no spaces after it: "Buy milk /ta" matches, "a/b" and "/due tomorrow" don't.
 * The same shape Lexical's basic typeahead match uses, for plain inputs.
 */
export function matchSlashTrigger(
	text: string,
	trigger = "/",
): SlashTriggerMatch | null {
	const escaped = trigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = new RegExp(`(?:^|\\s)${escaped}([^\\s${escaped}]*)$`).exec(
		text,
	);
	if (!match) return null;
	return {
		query: match[1] as string,
		index: match.index + match[0].length - match[1].length - trigger.length,
	};
}
