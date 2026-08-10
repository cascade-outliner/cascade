import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { NodesController } from "./nodes.controller";

@Module({
	imports: [DatabaseModule],
	controllers: [NodesController],
	providers: [],
})
export class NodesModule {}
