import { chat } from "@tanstack/ai";
import { anthropicText } from "@tanstack/ai-anthropic";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export const summarySchema = z.object({
	sentences: z.array(
		z.object({
			text: z.string().describe("One sentence without citation markers"),
			sources: z
				.array(z.number())
				.describe("The [n] numbers of the branches this sentence came from"),
		}),
	),
});

export type SummaryResult = z.infer<typeof summarySchema>;

export const SYSTEM = `You summarize one branch of a personal outliner: a line the user zoomed into, and everything nested under it. The summary is pinned under the branch's title, so the user can see where things stand without expanding every line.

Input
- The first line is the branch's title. Each direct child starts with its number, like "[2] Launch checklist". Their descendants are indented under them.
- Only lines starting with "[ ]" (open) or "[x]" (finished) are tasks. Every other line is a note: an idea, a heading, a fact, meeting minutes. Never call a note done, open, unowned, or overdue, and never turn it into a to-do.
- "(due YYYY-MM-DD)" is a due date; compare it with today's date to spot anything overdue.

Length
- Two to four sentences. Lead with the main points and decisions in the notes; if the branch has tasks, say what's done, what's open, and what's overdue.

Writing
- Plain, specific language in the user's own terms. Name things; don't describe the outline ("this branch contains…").
- Don't invent facts, owners, dates, or opinions. Leave out anything you're unsure of.
- No markdown, no bullet characters, no citation markers like [1] in the text.

Sources
- Every sentence lists the [n] numbers of the direct children it draws on, most relevant first. Use only numbers that exist in the input.`;

export const summarizeBranch = createServerFn({ method: "POST" })
	.validator(
		z.object({
			outline: z.string().trim().min(1).max(40_000),
			branches: z.number().int().nonnegative(),
			today: z.string().regex(ISO_DAY),
		}),
	)
	.handler(async ({ data }): Promise<SummaryResult> => {
		const result = await chat({
			adapter: anthropicText("claude-haiku-4-5"),
			systemPrompts: [SYSTEM],
			messages: [
				{
					role: "user",
					content: `Today is ${data.today}.\n\nBranch:\n${data.outline}`,
				},
			],
			outputSchema: summarySchema,
		});
		return {
			sentences: result.sentences.map((sentence) => ({
				text: sentence.text.replace(/\s*\[\d+\]/g, "").trim(),
				sources: [...new Set(sentence.sources)].filter(
					(n) => Number.isInteger(n) && n >= 1 && n <= data.branches,
				),
			})),
		};
	});
