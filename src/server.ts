import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { FastResponse } from "srvx";
import { bootstrap } from "#/core/bootstrap";

globalThis.Response = FastResponse;

// Run feature onInit hooks at server startup
bootstrap();

export default { fetch: createStartHandler(defaultStreamHandler) };
