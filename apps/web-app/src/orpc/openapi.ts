import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { router } from "./router.ts";

const generator = new OpenAPIGenerator({
	schemaConverters: [new ZodToJsonSchemaConverter()],
});

export function generateSpec() {
	return generator.generate(router, {
		info: {
			title: "Cascade API",
			version: "0.0.0",
		},
		servers: [{ url: "/api" }],
	});
}
