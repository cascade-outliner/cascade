import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
	FastifyAdapter,
	type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(),
	);

	// GET /health stays unversioned (VERSION_NEUTRAL) for infra probes;
	// everything else is namespaced under /v1 so future breaking changes
	// don't require a new deployment target.
	app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
	app.enableShutdownHooks();

	const port = Number(process.env.PORT ?? 3002);
	await app.listen(port, "0.0.0.0");
}

bootstrap();
