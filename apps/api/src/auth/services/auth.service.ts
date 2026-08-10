import type { IncomingHttpHeaders } from "node:http";
import { Inject, Injectable } from "@nestjs/common";
import { AUTH_SESSION } from "../constants/auth.constants";
import { AuthPrincipal, type SessionResolver } from "../types/auth.types";

function toWebHeaders(nodeHeaders: IncomingHttpHeaders): Headers {
	const headers = new Headers();

	for (const [name, value] of Object.entries(nodeHeaders)) {
		if (value === undefined) continue;
		if (Array.isArray(value)) {
			for (const item of value) headers.append(name, item);
		} else {
			headers.set(name, value);
		}
	}

	return headers;
}

@Injectable()
export class AuthService {
	constructor(
		@Inject(AUTH_SESSION) private readonly sessionResolver: SessionResolver,
	) {}

	resolve(headers: IncomingHttpHeaders): Promise<AuthPrincipal | null> {
		return this.sessionResolver.api.getSession({
			headers: toWebHeaders(headers),
		});
	}
}
