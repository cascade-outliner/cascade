import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
	FastifyAdapter,
	type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

const defaultAllowedOrigins =
	process.env.NODE_ENV === "production"
		? ["https://app.cascadelist.com", "https://cascadelist.com"]
		: [
				"http://localhost:3000",
				"http://localhost:3001",
				"https://app.cascadelist.com",
				"https://cascadelist.com",
			];

function allowedOrigins(): string[] {
	const configured = process.env.CORS_ORIGINS?.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
	return configured?.length ? configured : defaultAllowedOrigins;
}

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(),
	);

	app.enableShutdownHooks();
	app.enableCors({
		credentials: true,
		origin: allowedOrigins(),
	});

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true,
		}),
	);

	const swaggerConfig = new DocumentBuilder()
		.setTitle("Cascade API")
		.setVersion("1")
		.addCookieAuth("better-auth.session_token", undefined, "session")
		.build();

	const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
	SwaggerModule.setup("docs", app, swaggerDocument);

	const port = Number(process.env.PORT ?? 3002);
	await app.listen(port, "0.0.0.0");
}

bootstrap();
