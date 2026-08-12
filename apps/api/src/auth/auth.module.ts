import { Global, Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthService } from "./services/auth.service";
import { authProvider } from "./providers/auth.provider";

@Global()
@Module({
	imports: [DatabaseModule],
	providers: [authProvider, AuthService],
	exports: [AuthService],
})
export class AuthModule {}
