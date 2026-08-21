import { z } from "zod";

const envSchema = z.object({
	CASCADE_API_URL: z.url().default("http://localhost:3000/api"),
	CASCADE_API_TOKEN: z.string().min(1, "CASCADE_API_TOKEN is required"),
});

export const env = envSchema.parse(process.env);
