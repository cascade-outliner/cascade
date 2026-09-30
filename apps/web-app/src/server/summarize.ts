import { chat } from "@tanstack/ai";
import { anthropicText } from "@tanstack/ai-anthropic";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export const summarySchema = z.object({
	sentences: z.array(
		z.object({
			text: z
				.string()
				.describe(
					"One sentence (or, in status mode, one short item) without citation markers",
				),
			status: z
				.enum(["done", "progress", "blocked"])
				.nullable()
				.describe("In status mode, which group the item belongs to; else null"),
			sources: z
				.array(z.number())
				.describe("The [n] numbers of the branches this sentence came from"),
		}),
	),
});

export type SummaryResult = z.infer<typeof summarySchema>;

const MODES = {
	line: "Mode: one line. Exactly one sentence, at most 20 words, naming where the branch stands overall.",
	short:
		"Mode: short. Two to four sentences. Lead with what's settled or done, then what's moving, then what's stuck or has no owner.",
	status:
		"Mode: status. One short item per piece of work (a few words, no full sentences), each with a status: done, progress (in progress or not started), or blocked (waiting on something, or has no owner). Order them done, progress, blocked. At most 10 items; merge small related ones.",
} as const;

export const SYSTEM = `You summarize one branch of a personal outliner: a line the user zoomed into, and everything nested under it. The summary is pinned under the branch's title, so the user can see where things stand without expanding every line.

Input
- The first line is the branch's title. Each direct child starts with its number, like "[2] Launch checklist". Their descendants are indented under them.
- "[x]" is a finished task, "[ ]" an open one. "(due YYYY-MM-DD)" is a due date; compare it with today's date to spot anything overdue.

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
			mode: z.enum(["line", "short", "status"]),
			branches: z.number().int().nonnegative(),
			today: z.string().regex(ISO_DAY),
		}),
	)
	.handler(async ({ data }): Promise<SummaryResult> => {
		const result = await chat({
			adapter: anthropicText("claude-haiku-4-5"),
			systemPrompts: [SYSTEM, MODES[data.mode]],
			messages: [
				{
					role: "user",
					content: `Today is ${data.today}.\n\nBranch:\n${data.outline}`,
				},
			],
			outputSchema: summarySchema,
		});
		const sentences =
			data.mode === "line" ? result.sentences.slice(0, 1) : result.sentences;
		return {
			sentences: sentences.map((sentence) => ({
				text: sentence.text.replace(/\s*\[\d+\]/g, "").trim(),
				status: data.mode === "status" ? (sentence.status ?? "progress") : null,
				sources: [...new Set(sentence.sources)].filter(
					(n) => Number.isInteger(n) && n >= 1 && n <= data.branches,
				),
			})),
		};
	});
