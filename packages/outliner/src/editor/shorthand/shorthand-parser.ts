export interface ShorthandDateVocabulary {
	relative: Record<string, number>;
	weekdays: Record<string, number>;
	nextWord: string;
}

export interface ShorthandConfig {
	dates: ShorthandDateVocabulary;
}

export type ShorthandMatch =
	| { kind: "tag"; start: number; end: number; tag: string }
	| {
			kind: "dueDate";
			start: number;
			end: number;
			phrase: string;
			dueDate: Date;
	  };

const TAG_PATTERN =
	/(^|\s)#([\p{L}\p{N}](?:[\p{L}\p{N}_-]*[\p{L}\p{N}])?)(?=\s|$)/giu;

function addCalendarDays(date: Date, days: number): Date {
	const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	result.setDate(result.getDate() + days);
	return result;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseShorthand(
	text: string,
	config: ShorthandConfig,
	now = new Date(),
): ShorthandMatch[] {
	const matches: ShorthandMatch[] = [];
	for (const match of text.matchAll(TAG_PATTERN)) {
		const tag = match[2];
		if (!tag || tag.length > 64 || match.index === undefined) continue;
		const prefixLength = match[1]?.length ?? 0;
		matches.push({
			kind: "tag",
			start: match.index + prefixLength,
			end: match.index + match[0].length,
			tag,
		});
	}

	const phrases = [
		...Object.keys(config.dates.relative),
		...Object.keys(config.dates.weekdays),
		...Object.keys(config.dates.weekdays).map(
			(day) => `${config.dates.nextWord} ${day}`,
		),
	].sort((a, b) => b.length - a.length);
	if (phrases.length > 0) {
		const datePattern = new RegExp(
			`(^|\\s)!(${phrases.map(escapeRegExp).join("|")})(?=\\s|$)`,
			"giu",
		);
		for (const match of text.matchAll(datePattern)) {
			const phrase = match[2]?.toLowerCase();
			if (!phrase || match.index === undefined) continue;
			let dueDate: Date | undefined;
			const relativeDays = config.dates.relative[phrase];
			if (relativeDays !== undefined) {
				dueDate = addCalendarDays(now, relativeDays);
			} else {
				const nextPrefix = `${config.dates.nextWord.toLowerCase()} `;
				const explicitlyNext = phrase.startsWith(nextPrefix);
				const weekdayName = explicitlyNext
					? phrase.slice(nextPrefix.length)
					: phrase;
				const weekday = config.dates.weekdays[weekdayName];
				if (weekday !== undefined) {
					const base = (weekday - now.getDay() + 7) % 7 || 7;
					dueDate = addCalendarDays(now, base + (explicitlyNext ? 7 : 0));
				}
			}
			if (!dueDate) continue;
			const prefixLength = match[1]?.length ?? 0;
			matches.push({
				kind: "dueDate",
				start: match.index + prefixLength,
				end: match.index + match[0].length,
				phrase,
				dueDate,
			});
		}
	}

	return matches.sort((a, b) => a.start - b.start);
}
