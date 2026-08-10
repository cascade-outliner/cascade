import {
	CASCADE_API_AUDIENCE,
	validateJwtToken,
} from "@cascade/auth/token-validation";
import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	Logger,
	UnauthorizedException,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: Nest needs the runtime value for DI metadata.
import { ConfigService } from "@nestjs/config";
import type { AuthenticatedRequest } from "./authenticated-request";

@Injectable()
export class AuthGuard implements CanActivate {
	private readonly logger = new Logger(AuthGuard.name);

	constructor(private readonly configService: ConfigService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			throw new UnauthorizedException("Missing authorization header");
		}

		const [scheme, token] = authHeader.split(" ");
		if (scheme !== "Bearer" || !token) {
			throw new UnauthorizedException("Invalid authorization format");
		}

		const config = {
			jwksUrl: this.configService.getOrThrow<string>("BETTER_AUTH_JWKS_URL"),
			issuer: this.configService.getOrThrow<string>("BETTER_AUTH_URL"),
			audience: CASCADE_API_AUDIENCE,
		};

		try {
			request.user = await validateJwtToken(token, config);
			return true;
		} catch (error) {
			this.logger.warn(
				`JWT validation failed: ${
					error instanceof Error ? error.message : "unknown error"
				}`,
			);
			throw new UnauthorizedException("Invalid or expired access token");
		}
	}
}
