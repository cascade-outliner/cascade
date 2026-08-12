import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "../services/auth.service";
import { IS_PUBLIC_ROUTE } from "../constants/auth.constants";
import { AuthenticatedRequest } from "../types/auth.types";

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly authService: AuthService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(
			IS_PUBLIC_ROUTE,
			[context.getHandler(), context.getClass()],
		);

		if (isPublic) return true;

		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
		const principal = await this.authService.resolve(request.headers);

		if (!principal) throw new UnauthorizedException();

		request.principal = principal;
		return true;
	}
}
