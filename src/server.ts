import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { FastResponse } from "srvx";

export default { fetch: createStartHandler(defaultStreamHandler) };

globalThis.Response = FastResponse;
