import { chat } from "@tanstack/ai";
import { anthropicText } from "@tanstack/ai-anthropic";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const splitSchema = z.object({
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

const SYSTEM = `You split one line from a personal outliner into separate, actionable tasks.
Keep the user's wording; don't invent tasks that aren't in the line.
Pull dates and people out of the task text into "due" and "owner".
A line that is already a single task comes back as one task.`;

export const getAiConfig = createServerFn({ method: "GET" }).handler(
	async () => ({ enabled: !!process.env.ANTHROPIC_API_KEY }),
);

export const splitIntoTasks = createServerFn({ method: "POST" })
	.validator(
		z.object({
			text: z.string().trim().min(1).max(4_000),
			today: z.string().regex(ISO_DAY),
		}),
	)
	.handler(async ({ data }): Promise<SplitResult> => {
		const result = await chat({
			// Reads ANTHROPIC_API_KEY from the environment.
			adapter: anthropicText("claude-haiku-4-5"),
			systemPrompts: [SYSTEM],
			messages: [
				{
					role: "user",
					content: `Today is ${data.today}.\n\nLine:\n${data.text}`,
				},
			],
			outputSchema: splitSchema,
		});
		return {
			title: result.title,
			tasks: result.tasks.map((task) => ({
				...task,
				due: task.due && ISO_DAY.test(task.due) ? task.due : null,
			})),
		};
	});
