import { phraseRanges } from "@cascade/data";
import { chat } from "@tanstack/ai";
import { anthropicText } from "@tanstack/ai-anthropic";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export const splitSchema = z.object({
	title: z
		.string()
		.describe("A short title (2 to 4 words) for the line once split"),
	tasks: z.array(
		z.object({
			text: z
				.string()
				.describe(
					"The task as a short imperative starting with a capital letter, without its date or owner",
				),
			source: z
				.string()
				.describe(
					"The verbatim phrase in the line naming the action (verb and object only, no names or dates)",
				),
			due: z
				.string()
				.nullable()
				.describe("Due day as YYYY-MM-DD, resolved against today, or null"),
			owner: z
				.string()
				.nullable()
				.describe("First name of the person doing it, or null"),
		}),
	),
});

export type SplitResult = z.infer<typeof splitSchema>;
export type SplitTask = SplitResult["tasks"][number];

export const SYSTEM = `You split one line from a personal outliner into separate tasks. The line was typed in a hurry: a meeting note, a to-do dump, a forwarded message. The user sees the tasks as a checklist under a short title, with the phrase each task came from highlighted in the original line.

Splitting
- One task per distinct action the line asks for. Don't invent steps, follow-ups, or subtasks that aren't written.
- Shared context carries into every task it covers: "Call Anna and Bob about the invoice" is two tasks, both about the invoice.
- A list of items with an implied action ("Groceries: milk, eggs, bread") is one task per item, using the implied verb ("Buy milk").
- A line that is already one action comes back as one task. A line with no action at all (a thought, a quote, a heading) comes back with no tasks.

Task text
- A short imperative starting with a capital letter, in the user's own words. Keep their nouns, numbers, and names of things; change only what's needed to stand alone.
- Leave out the due date and the owner; they have their own fields. Keep people who are the object of the action ("Email Sara the deck").
- No trailing punctuation.

Source
- The exact phrase in the line the task came from, copied character for character, so it can be highlighted. Never rephrase or rejoin words that aren't adjacent in the line.
- Usually the verb and its object, without the due date or the owner's name. When one verb covers several tasks, the first source is the verb and its first object and each further source is just that task's object, even when a date sits in between: "call bob today and anna tomorrow" gives "call bob" and "anna", never "call anna".
- Every source must appear in the line and differ from the other tasks' sources.

Due
- Resolve relative dates against today's date and weekday from the message, as YYYY-MM-DD. "Friday" is the coming Friday (today, if today is Friday). "Next week" is next Monday. "End of the month" is the last day of this month. A month with no day is its 1st.
- A date stated once for the whole line applies to every task. No date, or a vague one ("soon", "at some point"), is null.

Owner
- The first name of the person doing the task. The user is the default and is null; "I", "me", "we", "let's" mean the user.
- Someone who is the object of the action ("Call Anna") is not the owner. "Anna to call the bank" or "Anna: call the bank" makes Anna the owner.

Title
- 2 to 4 words naming what the tasks share, like a heading: "Invoice follow-up", "Launch prep". Not a sentence, no trailing punctuation.`;

/**
 * The longest tail of `source` the line actually contains, so the highlight
 * survives a model that rejoins a shared verb with a later object ("call anna"
 * for "call bob today and anna tomorrow" becomes "anna").
 */
function inLine(text: string, source: string): string {
	const words = source.trim().split(/\s+/);
	for (let i = 0; i < words.length; i++) {
		const tail = words.slice(i).join(" ");
		if (phraseRanges(text, [tail]).length > 0) return tail;
	}
	return source;
}

const weekday = (day: string) =>
	new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
		weekday: "long",
		timeZone: "UTC",
	});

export const splitIntoTasks = createServerFn({ method: "POST" })
	.validator(
		z.object({
			text: z.string().trim().min(1).max(4_000),
			today: z.string().regex(ISO_DAY),
		}),
	)
	.handler(async ({ data }): Promise<SplitResult> => {
		const result = await chat({
			adapter: anthropicText("claude-haiku-4-5"),
			systemPrompts: [SYSTEM],
			messages: [
				{
					role: "user",
					content: `Today is ${weekday(data.today)} ${data.today}.\n\nLine:\n${data.text}`,
				},
			],
			outputSchema: splitSchema,
		});
		return {
			title: result.title,
			tasks: result.tasks.map((task) => ({
				...task,
				source: inLine(data.text, task.source),
				due: task.due && ISO_DAY.test(task.due) ? task.due : null,
			})),
		};
	});
